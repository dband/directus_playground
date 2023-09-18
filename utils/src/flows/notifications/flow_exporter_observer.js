import chalk from 'chalk';

export class FlowExportObserver {

    constructor() {
        this.hastagDelim = chalk.bold('##############################');
        this.lineDelim = chalk.bold('------------------------------');
    }

    notify(eventName, meta = {}) {
        switch(eventName) {
            case 'start': this.start(); break;
            case 'load_local': this.load_local(); break;
            case 'after_load_local': this.after_load_local(meta); break;
            case 'load_remote': this.load_remote(); break;
            case 'after_load_remote': this.after_load_remote(meta); break;
            case 'convert_flow': this.convert_flow(meta); break;
            case 'conversion_done': this.conversion_done(meta); break;
            case 'apply_delete_operations': this.apply_delete_operations(meta); break;
            case 'apply_delete_operation': this.apply_delete_operation(meta); break;
            case 'apply_update_operations': this.apply_update_operations(meta); break;
            case 'apply_update_operation': this.apply_update_operation(meta); break;
            case 'apply_create_operations' : this.apply_create_operations(meta); break;
            case 'apply_create_operation': this.apply_create_operation(meta); break;
            case 'flows_to_file': this.flows_to_file(meta); break;
            case 'done': this.done(); break;
            default: ; 
        }
    }

    start() {
        console.log(this.hastagDelim);
        console.log(chalk.bold('Start exporting Flows'));
        console.log(this.hastagDelim);
    }

    load_local() {
        console.log(this.lineDelim);
        console.log(chalk.bold('Load current Flows and Operations hierachie from file'));
        console.log(this.lineDelim);
    }

    after_load_local(currentFlows) {
        console.log(chalk.magenta(`Found ${currentFlows.length} local Flows`));
        for (const flow of currentFlows) {
            console.log(`${chalk.yellow(flow.name)} => ${flow.operations.map(op => chalk.cyan(op.name)).join(' => ')}`);
        }
    }

    load_remote() {
        console.log(this.lineDelim);
        console.log(chalk.bold('Load Flows and Operations from source; create Operations hierachie'));
        console.log(this.lineDelim);
    }

    after_load_remote(flows) {
        console.log(chalk.magenta(`Found ${flows.length} remote Flows`));
        
        console.log(this.lineDelim);
        console.log(chalk.bold('Convert the following remote flows:'));
        console.log(this.lineDelim);
    }

    convert_flow(convertedFlow) {        
        console.log(`${chalk.yellow(convertedFlow.flow.name)} => ${convertedFlow.flow.operations.map(op => chalk.cyan(op.name)).join(' => ')}`);
    }

    conversion_done(converted) {
        console.log(chalk.magenta(`Converted ${converted.length} Flows`));
        console.log(this.lineDelim);
        console.log('Start applying operations');
        console.log(this.lineDelim);
    }

    apply_delete_operations(meta) {
        console.log(this.lineDelim);
        console.log(chalk.bold('Apply delete operations'));
        console.log(this.lineDelim);
        console.log('Remove the following Flows:');

        if (meta.length == 0) {
            console.log(chalk.red('No Flows to delete'));
        }
    }

    apply_delete_operation(flow) {
        console.log(`${chalk.red(flow.name)}`);
    }

    apply_update_operations(updateOperations) {
        console.log(this.lineDelim);
        console.log(chalk.bold('Apply update operations'));
        console.log(chalk.bold('Compare present and updated Flows for changes'));
        console.log(this.lineDelim);
        console.log('Update the following Flows:')

        if (updateOperations.length == 0) {
            console.log(chalk.red('No Flows to update'));
        }
    }

    apply_update_operation(op) {
        console.log(`${chalk.blue(op.flow.name)}`);
    }

    apply_create_operations(createOperations) {
        console.log(this.lineDelim);
        console.log(chalk.bold('Apply create operations'));
        console.log(this.lineDelim);
        console.log('Create the following Flows:')

        if (createOperations.length == 0) {
            console.log(chalk.red('No Flows to create'));
        }
    }

    apply_create_operation(op){
        console.log(`${chalk.green(op.flow.name)}`);
    }

    flows_to_file(_flows) {
        console.log(this.lineDelim);
        console.log(chalk.bold('Write out Flows to file'));
        console.log(this.lineDelim);
    }

    done() {
        console.log(this.hastagDelim);
        console.log(chalk.bold('Done'));
        console.log(this.hastagDelim);
    }
}