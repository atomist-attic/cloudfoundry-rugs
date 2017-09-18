import { CommandHandler, Intent, MappedParameter, Parameter, Secrets, Tags } from "@atomist/rug/operations/Decorators";
import { CommandPlan, HandleCommand, HandlerContext, ResponseMessage } from "@atomist/rug/operations/Handlers";
import { Pattern } from "@atomist/rug/operations/RugOperation";

import { error, success } from "../Handlers";

import { Configuration, configured, Value } from "../../config/Configuration";
import { CloudFoundryParameters, qualifiedAppName } from "./CloudFoundryParameters";

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

    @Parameter(CloudFoundryParameters.app)
    public app: string;

    @Parameter(CloudFoundryParameters.space)
    public space: string;

    @Value("organization", "atomist")
    public organization: string;

    @MappedParameter("atomist://correlation_id")
    public corrId: string;

    public handle(context: HandlerContext): CommandPlan {
        const plan = new CommandPlan();

        const appPhrase = qualifiedAppName(this.app, this.organization, this.space);

        plan.add({
            instruction: {
                kind: "execute",
                name: "cf-stop",
                parameters: this,
            },
            onSuccess: success(`Successfully stopped ${appPhrase}`),
            onError: error(`Failed to stop ${appPhrase}`, this.corrId),
        });

        return plan;
    }
}

export const stopApplication = configured(StopApplication);
