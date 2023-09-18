export class Observer {
    
    constructor(listeners = []) {
        this.listeners = listeners;
    }
    
    notify(event, meta = {}) {
        this.listeners.forEach( o => o.notify(event, meta));
    }
}