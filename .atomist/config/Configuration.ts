import { HandlerContext } from "@atomist/rug/operations/Handlers";

import * as cortex from "@atomist/cortex/Types";
import * as core from "@atomist/rug/model/Core";

import * as aop from "./Aspect";

export function configure(target: any, ctx: HandlerContext) {

    // Trigger configuration only if there are some @Value-annotated properties
    if (shouldConfigureTarget(target)) {
        configureTarget(target, loadConfigurationSources(target, ctx));
    }
}

export function Value(key: string, defaultValue?: string) {
    return (target: any, value: string) => {
        let configs = target.__configurations;
        if (configs == null) {
            configs = [];
        }
        const config = { key, value, defaultValue };
        configs.push(config);
        target.__configurations = configs;
    };
}

export function Configuration(location: Source) {
    return (target: any) => {

        let params = get_metadata(target, "__configuration_sources");
        if (params == null) {
            params = [];
        }
        params.push(location);
        set_metadata(target, "__configuration_sources", params);
        return target;
    };
}

export interface Source {
    repository?: string;
    branch?: string;
    paths: string[];
}

// tslint:disable-next-line:ban-types
export function configured<T>(target: Function, ...args: any[]): T {
    const rug = createInstance<T>(target, ...args) as any;
    if (rug.handle) {
        aop.Weaver.before(
            target,
            "handle",
            // tslint:disable-next-line:no-shadowed-variable
            (event: aop.WeaveEvent, args: any) =>
                configure(event.target.prototype, args[0] as HandlerContext),
        );
    } else if (rug.edit) {
        console.log("Can't configure EditProject instances");
    } else if (rug.populate) {
        console.log("Can't configure PopulateProject/ProjectGenerator instances");
    }
    return rug;
}

export function shouldConfigureTarget(target: any) {
    const c = target.__configurations;
    return c != null && c.length > 0;
}

export function configureTarget(target: any, configurations: any[]) {
    const c = target.__configurations;
    for (const f of c) {
        const segments = f.key.split(".");
        target[f.value] = f.defaultValue;
        for (const configuration of configurations) {
            let value = configuration;
            for (const s of segments) {
                if (value) {
                    value = value[s];
                }
            }
            if (value) {
                target[f.value] = value;
            }
        }
    }
}

function loadConfigurationSources(target: any, ctx: HandlerContext): any[] {
    const configurations = [];

    let sources = target.__configuration_sources as Source[];
    if (sources == null) {
        sources = [{ paths: ["config.json"] }];
    }

    for (const source of sources) {
        try {
            const project = ctx.pathExpressionEngine.scalar<cortex.ChatTeam, core.Project>
                (ctx.contextRoot as cortex.ChatTeam,
                `/orgs::Org()
                    /repo::Repo()[@name='${source.repository ? source.repository : "atomist-config"}']
                        /${source.branch ? source.branch : "master"}::Project()`);

            let paths = source.paths;
            if (paths == null || paths.length === 0) {
                paths = [".atomist/config.json"];
            }

            for (const path of paths) {
                const file = project.findFile(path);
                if (file) {
                    const content = resolvePlaceholders(file.content, project);
                    const configuration = JSON.parse(content);
                    configurations.push(configuration);
                }
            }
        } catch (e) {
            if (!source.repository) {
                // it's OK to skip this if the configuration repo hasn't been created
            } else {
                throw e;
            }
        }
    }
    return configurations;
}

function resolvePlaceholders(target: string, project: core.Project): string {
    // TODO resolve placeholders;
    // For now we only support ${file://<path>}
    const regex = new RegExp("\"\\$\{file:\/\/(.*)\}\"");
    let m = regex.exec(target);

    if (m != null) {
        if (project.fileExists(m[1])) {
            const content = project.findFile(m[1]).content;
            if (isJson(content)) {
                target = target.split(m[0]).join(content);
            } else {
                target = target.split(m[0]).join(
                    // We have to cut the additional " at the first and last pos
                    JSON.stringify(project.findFile(m[1]).content));
            }
        } else {
            return target;
        }
    }

    // Is the following really required to get all matches?
    m = regex.exec(target);
    if (m != null) {
        target = resolvePlaceholders(target, project);
    }
    return target;
}

function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

// tslint:disable-next-line:ban-types
function createInstance<T>(target: Function, ...args: any[]): T {
    const instance = Object.create(target.prototype);
    instance.constructor.apply(instance, args);
    return instance as T;
}

function set_metadata(obj: any, key: string, value: any) {
    let target = obj;
    if (obj.prototype !== undefined) {
        // should only be true for class Decorators
        target = obj.prototype;
    }
    Object.defineProperty(target, key,
        {
            value,
            writable: false,
            enumerable: false,
            configurable: false,
        });
}

function get_metadata(obj: any, key: string) {
    let desc = Object.getOwnPropertyDescriptor(obj, key);
    if ((desc == null || desc === undefined) && (obj.prototype !== undefined)) {
        desc = Object.getOwnPropertyDescriptor(obj.prototype, key);
    }
    if (desc != null || desc !== undefined) {
        return desc.value;
    }
    return null;
}
