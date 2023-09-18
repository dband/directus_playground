import { readFile } from '../lib.js';
import { Observer } from '../observer.js'

export class ImportFlows {

    constructor(destClient, observer = new Observer()) {
        this.destClient = destClient;
        this.observer = observer;
    }

    async execute(path) {
        this.observer.notify('start_import');
        this.observer.notify('read_file', path);
        const flows = JSON.parse(await readFile(path));

        this.observer.notify('parsed_file', flows);

        this.observer.notify('deactivate_flows', flows);

        // Deactivate all Flows on the destination system, so that non triggered during the migration
        const flowsData = await this.destClient({url: '/flows', params: {'filter[status][_eq]': 'active'}});
        const remoteFlows = flowsData.data.data ?? [];
        
        const keys = remoteFlows.map(f => f.id);
        const deactivateResult = await this.destClient({url: '/flows', method:'patch', data: {keys: keys, data: {status: 'inactive'}}});
        if (deactivateResult.status !== 200) { 
            this.observer.notify('deactivate_flows_failure', keys);
            return false;
        }

        const allOperations = await this.destClient('/operations');
        for (const operation of allOperations.data.data) {
            await this.destClient({method: 'patch', url: `/operations/${operation.id}`, data: {resolve: null, reject: null}});
        }

        this.observer.notify('deactivated_flows', keys);

        for (const flow of flows) {
            const {operations, operation, ...directusFlow} = flow;

            const flowExistsResult = await this.destClient({url: '/flows', params: {'filter[id][_eq]': flow.id}});
            if (flowExistsResult.status == 200 && flowExistsResult.data.data.length == 0) {
                const createFlowResult = await this.destClient({method: 'post', url: '/flows', data: {...directusFlow, ...{status: 'inactive'}}});
                if (createFlowResult.status != 200) {
                    this.observer.notify('create_flow_failure', flow);
                    return false;
                }

                this.observer.notify(`flow_created`, flow);
            }
  
            const reverseOperations = operations.reverse();

            this.observer.notify(`export_operations`, flow);

            for (const operation of reverseOperations) {
                
                const operationExistsResult = await this.destClient({url: '/operations', params: {'filter[id][_eq]': operation.id}});
                if (operationExistsResult.status == 200 && operationExistsResult.data.data.length > 0) {
                    this.observer.notify('operation_already_present', operation);
                    
                    const updateResult = await this.destClient({method: 'patch', url: `/operations/${operation.id}`, data: operation});

                    this.observer.notify('update_flow_result', updateResult);
                    continue;
                }

                const createOperationResult = await this.destClient({method: 'post', url: '/operations', data: operation});
                if (createOperationResult.status != 200) {
                    this.observer.notify('create_operation_failure', operation);
                    return false;
                }

                this.observer.notify('created_operation', operation)
            }
        }

        for (const flow of flows) {
            this.observer.notify(`export_flow`, flow);

            const flowExistsResult = await this.destClient({url: '/flows', params: {'filter[id][_eq]': flow.id}});
            if (flowExistsResult.status == 200 && flowExistsResult.data.data.length > 0) {
                this.observer.notify('flow_already_present', flow);
                
                const updateResult = await this.destClient({method: 'patch', url: `/flows/${flow.id}`, data: {operation: flow.operation, status: 'active'}});
                this.observer.notify('update_flow_result', updateResult);
            } else {
                this.observer.notify(`flow_not_created`, flow);
                return false;
            }
        }

        this.observer.notify('import_successfull');
        return true;
    }
}