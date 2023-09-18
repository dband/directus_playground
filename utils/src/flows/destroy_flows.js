/**
 * Destroy flows including their operations from the remote source
 * If flowIds is empty, all flows destroyed
 */
export class DestroyFlows {

    constructor(client, observer = new Observer()) {
        this.client = client;
        this.observer = observer;
    }

    async execute(flowIds = []) {
        this.observer.notify('start_destroy');

        if (flowIds.length == 0) {
            const flowsData = await this.client({url: '/flows', params: {'fields':'id', 'filter[status][_eq]': 'active', 'filter[operation][_nnull]': true}});
            flowIds = flowsData.data.data.map(f => f.id) ?? [];
        }

        this.observer.notify('destroy_flows', flowIds);
        if (flowIds.length == 0) {
            return true;
        }


        const createFlowResult = await this.client({method: 'delete', url: `/flows`, data: flowIds});
        if (createFlowResult.status != 204) {
            this.observer.notify('destroy_flow_failure', createFlowResult);
            return false;
        }

        this.observer.notify('destroy_sucessfull');
        return true;
    }
}