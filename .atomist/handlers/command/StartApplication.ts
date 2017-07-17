import { CommandHandler, Intent, MappedParameter, Parameter, Secrets, Tags } from "@atomist/rug/operations/Decorators";
import { CommandPlan, HandleCommand, HandlerContext, ResponseMessage } from "@atomist/rug/operations/Handlers";
import { Pattern } from "@atomist/rug/operations/RugOperation";

import { error, success } from "../Handlers";

import { Configuration, configured, Value } from "../../config/Configuration";

/**
 * Stop a CloudFoundry application.
 */
@CommandHandler("StartApplication", "Start a CloudFoundry application")
@Tags("cloundfoundry")
@Intent("cf start")
@Secrets(
    "secret://team?path=cloudfoundry/user",
    "secret://team?path=cloudfoundry/password",
)
@Configuration(
    { paths: ["cloudfoundry.json"] },
)
export class StartApplication implements HandleCommand {

    @Parameter({
        displayName: "Application Name",
        description: "Name of CloudFoundry Application",
        pattern: Pattern.any,
        validInput: "a valid CloudFoundry application name",
        minLength: 1,
        maxLength: 100,
        required: true,
    })
    public app: string;

    @Value("organization", "atomist")
    public organization: string;
    @Value("space", "development")
    public space: string;

    @MappedParameter("atomist://correlation_id")
    public corrId: string;

    public handle(context: HandlerContext): CommandPlan {
        const plan = new CommandPlan();

        plan.add({
            instruction: {
                kind: "execute",
                name: "cf-start",
                parameters: this,
            },
            onSuccess: success(`Successfully started \`${this.app}\``),
            onError: error(`Failed to start \`${this.app}\``, this.corrId),
        });

        return plan;
    }
}

export const startApplication = configured(StartApplication);
