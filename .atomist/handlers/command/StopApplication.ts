import { CommandHandler, Intent, MappedParameter, Parameter, Secrets, Tags } from "@atomist/rug/operations/Decorators";
import { CommandPlan, HandleCommand, HandlerContext, ResponseMessage } from "@atomist/rug/operations/Handlers";
import { Pattern } from "@atomist/rug/operations/RugOperation";

import { error, success } from "../Handlers";

import { Configuration, configured, Value } from "../../config/Configuration";

/**
 * Stop a Cloud Foundry application.
 */
@CommandHandler("StopApplication", "Stop a Cloud Foundry application")
@Tags("cloudfoundry")
@Intent("cf stop")
@Secrets(
    "secret://team?path=cloudfoundry/user",
    "secret://team?path=cloudfoundry/password",
)
@Configuration(
    { paths: ["cloudfoundry.json"] },
)
export class StopApplication implements HandleCommand {

    @Parameter({
        displayName: "Application Name",
        description: "Name of Cloud Foundry Application",
        pattern: Pattern.any,
        validInput: "a valid Cloud Foundry application name",
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
                name: "cf-stop",
                parameters: this,
            },
            onSuccess: success(`Successfully stopped \`${this.app}\``),
            onError: error(`Failed to stop \`${this.app}\``, this.corrId),
        });

        return plan;
    }
}

export const stopApplication = configured(StopApplication);
