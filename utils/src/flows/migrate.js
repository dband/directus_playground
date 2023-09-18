import chalk from 'chalk';

function findResource(name, collection) {
    return collection.find(collection => collection.name == name);
}

/**
 * Migrates flows and operations from one env to another
 * @param sourceClient an Axios client 
 * @param destClient an Axios client 
 */
export async function migrateFlows(sourceClient, destClient) {
    console.log('------------------------------');
    console.log('Migrate Flows');
    console.log('------------------------------');
    
    const result = [];
    const flowsData = await sourceClient({url: '/flows', params: {'filter[status][_eq]': 'active', 'filter[operation][_nnull]': true}});
    const flows = flowsData.data.data ?? [];

    const destFlowsData = await destClient('/flows');
    const destFlows = destFlowsData.data.data ?? [];
    
    // Deactivate all Flows on the destination system, so that non triggered during the migration
    const keys = destFlows.map(f => f.id);
    const deactivateResult = await destClient({url: '/flows', method:'patch', data: {keys: keys, data: {status: 'inactive'}}});
    if (deactivateResult.status !== 200) { 
        console.error('Colud not deactivate flows');
        process.exit(1);
    }

    for (const flow of flows) {
        const ops = await getOperation(flow.operation, sourceClient);
        const op = ops.data.data;
        const opsTree = await getNextOperation(op, sourceClient);

        // Create or update flows
        const {user_created, operations, ...partialFlow} = flow;
        const flowData = findResource(flow.name, destFlows);

        const destResult = {};
        if (flowData == undefined) {
            const createResult = await destClient({method: 'post', url: '/flows', data: partialFlow});
            destResult.status = createResult.status == 200;
            destResult.type = 'create';
            destResult.flowId = createResult.data.data.id;
            
        } else {
            const updateResult = await destClient({method: 'patch', url: `/flows/${flowData.id}`, data: partialFlow});;
            destResult.status = updateResult.status == 200;
            destResult.type = 'update';
            destResult.flowId = updateResult.data.data.id;
        }

        if (destResult.status) {
            result.push({flow: flow.name, opTree: opsTree, flowId: destResult.flowId});
        }
        console.log(destResult.status ? destResult.type == 'create' ? chalk.green(`${flow.name}`) : chalk.blue(`${flow.name}`) : chalk.red(`${flow.name}`));
    }

    console.log('------------------------------');
    console.log('Migrate Operations');
    console.log('------------------------------');

    for (const {flow, opTree, flowId} of result) {
        const destOperations = await destClient({url: '/operations', params: {'filter[flow][_eq]': flowId}});
        const destOps = destOperations.data.data ?? [];
        
        const keys = destOps.map(f => f.id);
        if (keys.length > 0) {
            const unlinkResult = await destClient({url: '/operations', method: 'patch', data: {keys: keys, data: {resolve: null, reject: null}}});
        }

        let result = [];
        for (const op of opTree) {
            let status = '';
            const {user_created, ...partialOperation} = op;
            
            const operationData = findResource(op.name, destOps);
            if (operationData == undefined) {
                const createResult = await destClient({method: 'post', url: '/operations', data: partialOperation});
                status = createResult.status == 200 ? 'created' : 'create_error';
            } else {
                const updateResult = await destClient({method: 'patch', url: `/operations/${operationData.id}`, data: partialOperation});
                status = updateResult.status == 200 ? 'updated' : 'update_error';
            }

            if (status == 'updated' ) {
                result.push(chalk.blue(`${op.name}`));
            }
            else if (status == 'created') {
                result.push(chalk.green(`${op.name}`));
            } else {
                result.push(chalk.red(`${status}: ${op.name}`));
            }
        }

        console.log(`${flow} => ${result.reverse().join(' => ')}`);
    }

    console.log('------------------------------');
    console.log('Inactive Flows');
    console.log('------------------------------');
    
    const inactiveFlowsData = await destClient({url: '/flows', params: {'filter[status][_eq]': 'inactive'}});
    const inactiveflows = inactiveFlowsData.data.data ?? [];
    for (const flow of inactiveflows) {
        console.log(chalk.hex('#4f2b17')(flow.name));
    }

    console.log('------------------------------');
    console.log('Unlinked Operations');
    console.log('------------------------------');

    const unlinkedAndLastOperationsData = await destClient({url: '/operations', params: {sort: 'flow', fields: 'id, name, flow.name, flow.id', filter: {_and: [{ 'resolve': {'_null': true}  }, { 'reject': {'_null': true} }]}}});
    const unlinkedAndLastOps = unlinkedAndLastOperationsData.data?.data ?? [];
    for (const op of unlinkedAndLastOps) {
        const unlinkedOpsData = await destClient({'url': '/operations', params: {filter: {_or: [{reject: {_eq: op.id}},{resolve: {_eq: op.id}}]}}})
        if (unlinkedOpsData.data?.data.length > 0) {
            continue;
        }

        const unlinkedFirstOps = await destClient({'url': '/flows', params: {filter: {operation: {_eq: op.id}}}});
        if (unlinkedFirstOps.data?.data.length > 0) {
            continue;
        }

        console.log(chalk.hex('#4f2b17')(`${op.flow.name}: ${op.name}`));
    }
}

async function getOperation(id, client) {
    return await client(`/operations/${id}`);
}

async function getNextOperation(op, client, tree = []) {
    if (!op.resolve && !op.reject) {
        return [op];   
    }

    const resolve = await solveOperation(op.resolve, client, tree);
    const reject = await solveOperation(op.reject, client, tree);

    return [...tree, ...resolve, ...reject, op];
}

async function solveOperation(property, client, tree) {
    if (property == null) {
        return [];
    }
    const nextOp = await getOperation(property, client);
    return await getNextOperation(nextOp.data.data, client, tree);
}
