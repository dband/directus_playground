import { readFile, writeFile } from '../lib.js';
import { Observer } from '../observer.js'
import _ from 'lodash'

export class ExportFlows {

    constructor(sourceClient, observer = new Observer()) {
        this.sourceClient = sourceClient;
        this.observer = observer;
    }

    async execute(path) {
        this.observer.notify('start');
        this.observer.notify('load_local');
        
        const flowResult = await readFile(path);
        const localFlows = flowResult ? JSON.parse(flowResult) : [];
        
        this.observer.notify('after_load_local', localFlows);
        this.observer.notify('load_remote');

        const mergedFlows = [];
        
        const flowsData = await this.sourceClient({url: '/flows', params: {'filter[status][_eq]': 'active', 'filter[operation][_nnull]': true}});
        const remoteFlows = flowsData.data.data ?? [];

        this.observer.notify('after_load_remote', remoteFlows);
    
        for (const flow of remoteFlows) {
            const op = await this.getOperation(flow.operation, this.sourceClient);
            const opsTree = (await this.getNextOperation(op, this.sourceClient)).reverse();
    
            const {user_created, operations, ...partialFlow} = flow;
            const presentFlow = this.findResourceByName(flow.name, localFlows);

            const converted = {
                presentFlow: presentFlow,
                flow: {...partialFlow, ...{operations: opsTree}},  
            }
            mergedFlows.push(converted);

            this.observer.notify('convert_flow', converted);
        }

        this.observer.notify('conversion_done', mergedFlows);

        const newFlows = this.applyOperationsOn(mergedFlows, localFlows, remoteFlows);
     
        this.observer.notify('flows_to_file', newFlows);

        await writeFile(path, JSON.stringify(newFlows, null, 4));
    
        this.observer.notify('done');
    }

    applyOperationsOn(mergedFlows, localFlows, remoteFlows) {
        const filter = localFlows.reduce((acc, current) => {
            if (this.findResourceByName(current.name, remoteFlows)) {
                return {flowsToDelete: acc.flowsToDelete, remaining: [...acc.remaining, ...[current]]};
            }

            return {flowsToDelete: [...acc.flowsToDelete, ...[current]], remaining: acc.remaining};
        }, {flowsToDelete: [], remaining: []});

        this.observer.notify('apply_delete_operations', filter.flowsToDelete);
        filter.flowsToDelete.forEach(f => this.observer.notify('apply_delete_operation', f));
        
        const newFlows = filter.remaining;
    
        const updateOperations = mergedFlows.filter(op => {
            const t = op.presentFlow != undefined && !_.isEqual(op.presentFlow, op.flow);
            return t;
        });
        const updatedFlows = this.createFlowsFrom('update', updateOperations);
        for (const flow of updatedFlows) {
            const index = newFlows.findIndex(f => f.id == flow.id);
            newFlows[index] = flow;
        }

        const createOperations = mergedFlows.filter(op => op.presentFlow == undefined);
        const createdFlows = this.createFlowsFrom('create', createOperations);

        return [...newFlows, ...createdFlows].sort((a,b) => a.name.localeCompare(b.name));
    }

    createFlowsFrom(opName, operations) {
        const newFlows = [];

        this.observer.notify(`apply_${opName}_operations`, operations);

        for (const op of operations) {
            const flow = op.flow;
            newFlows.push(flow);

            this.observer.notify(`apply_${opName}_operation`, op);
        }

        return newFlows;
    }

    async getOperation(id, client) {
        const operations = await client(`/operations/${id}`);
        const {user_created, ...partialOperation} = operations.data.data;
        return partialOperation;
    }
    
    async getNextOperation(op, client, tree = []) {
        if (!op.resolve && !op.reject) {
            return [op];   
        }
    
        const resolve = await this.solveOperation(op.resolve, client, tree);
        const reject = await this.solveOperation(op.reject, client, tree);
    
        return [...tree, ...resolve, ...reject, op];
    }
    
    async solveOperation(property, client, tree) {
        if (property == null) {
            return [];
        }
        const nextOp = await this.getOperation(property, client);
        return await this.getNextOperation(nextOp, client, tree);
    }

    findResourceByName(name, inCollection) {
        return inCollection.find(collection => collection.name == name);
    }
}