import {
    CommandHandler,
    Intent,
    MappedParameter,
    Parameter,
    ParseJson,
    ResponseHandler,
    Secrets,
    Tags,
} from "@atomist/rug/operations/Decorators";
import {
    CommandPlan,
    HandleCommand,
    HandlerContext,
    HandleResponse,
    MappedParameters,
    MessageMimeTypes,
    Respond,
    Response,
    ResponseMessage,
} from "@atomist/rug/operations/Handlers";

import { GenericErrorHandler, GenericSuccessHandler } from "@atomist/rugs/operations/CommonHandlers";

export const successHandler = new GenericSuccessHandler();
export const errorHandler = new GenericErrorHandler();

export function success(msg: string): Respond {
    return {
        kind: "respond",
        name: "GenericSuccessHandler",
        parameters: {
            msg,
        },
    };
}

export function error(msg: string, corrid: string): Respond {
    return {
        kind: "respond",
        name: "GenericErrorHandler",
        parameters: {
            msg,
            corrid,
        },
    };
}
