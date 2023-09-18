import chalk from 'chalk';

export class FlowDestroyObserver {

    constructor() {
        this.hastagDelim = chalk.bold('##############################');
        this.lineDelim = chalk.bold('------------------------------');
    }

    notify(eventName, meta = {}) {
        switch(eventName) {
            case 'start_destroy': this.start(); break;
            case 'destroy_flows': this.destroy_flows(meta); break;
            case 'destroy_flow_failure': this.destroy_flow_failure(meta); break;
            case 'destroy_sucessfull': this.destroy_sucessfull(); break;
            default: ; 
        }
    }

    start() {
        console.log(this.hastagDelim);
        console.log('Start destroying flows');
        console.log(this.hastagDelim);
    }

    destroy_flows(flowIds) {
        console.log(this.lineDelim);
        if (flowIds.length == 0) {
            console.log('No flows to destroy');
        } else {
            console.log('Destroy the following flows:');
            console.log(flowIds.join('\n'));
        }
        console.log(this.lineDelim);
    }

    destroy_flow_failure(result) {
        console.log(this.lineDelim);
        console.log(chalk.red('Failed destroying flows'));
        console.log(this.lineDelim);
    }

    destroy_sucessfull() {
        console.log(this.lineDelim);
        console.log(chalk.green('Successfully destroyed all workflows'));
        console.log(this.lineDelim);
    }
}