
export class WeaveEvent {
    // tslint:disable-next-line:ban-types
    constructor(public target: Function, public name: string, public method: string, public error: Error = null) {
    }

    public toString(): string {
        let eventString = "Event: " + this.name + ". Method: " + this.method + ".";
        if (this.error) {
            eventString += " Error: " + this.error.name + " " + this.error.message + ".";
        }
        return eventString;
    }
}

export class Weaver {
    // Will fire before the target is called
    // tslint:disable-next-line:ban-types
    public static before(target: Function, method: string, action: Function): void {
        const old = target.prototype[method];
        const event = new WeaveEvent(target, "before", method);

        target.prototype[method] = function() {
            const args = Array.prototype.slice.call(arguments);
            action.apply(this, [event, args]);
            const result = old.apply(this, args);
            return result;
        };
    }

    // Will fire after the target is called successfully
    // tslint:disable-next-line:ban-types
    public static after(target: Function, method: string, action: Function): void {
        const old = target.prototype[method];
        const event = new WeaveEvent(target, "after", method);

        target.prototype[method] = function() {
            const args = Array.prototype.slice.call(arguments);
            const result = old.apply(this, args);
            action.apply(this, [event, args]);
            return result;
        };
    }

    // Will fire after the target is called, whether the call was successful or not
    // tslint:disable-next-line:ban-types
    public static afterAll(target: Function, method: string, action: Function): void {
        const old = target.prototype[method];
        const event = new WeaveEvent(target, "afterAll", method);

        target.prototype[method] = function() {
            const args = Array.prototype.slice.call(arguments);
            try {
                const result = old.apply(this, args);
                return result;
            } finally {
                action.apply(this, [event, args]);
            }
        };
    }

    // Will fire if the target fails
    // tslint:disable-next-line:ban-types
    public static error(target: Function, method: string, action: Function): void {
        const old = target.prototype[method];

        target.prototype[method] = function() {
            const args = Array.prototype.slice.call(arguments);
            try {
                const result = old.apply(this, args);
                return result;
            } catch (ex) {
                const event = new WeaveEvent(target, "error", method, ex);
                action.apply(this, [event, args]);
                throw ex;
            }
        };
    }
}
