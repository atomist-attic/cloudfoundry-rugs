import { CommandHandler, Intent, MappedParameter, Parameter, Secrets, Tags } from "@atomist/rug/operations/Decorators";
import { CommandPlan,
    CommandRespondable,
    Execute,
    HandleCommand,
    HandlerContext,
    MappedParameters,
    ResponseMessage } from "@atomist/rug/operations/Handlers";
import { Pattern } from "@atomist/rug/operations/RugOperation";

import { error, success } from "../Handlers";

import { Configuration, configured, Value } from "../../config/Configuration";

/**
 * Scale a Cloud Foundry application.
 */
@CommandHandler("ScaleApplication", "Scale a Cloud Foundry application")
@Tags("cloudfoundry")
@Intent("cf scale")
@Secrets(
    "secret://team?path=cloudfoundry/user",
    "secret://team?path=cloudfoundry/password",
)
@Configuration(
    { paths: ["cloudfoundry.json"] },
)
export class ScaleApplication implements HandleCommand {

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

    @Parameter({
        displayName: "Instances",
        description: "Number of Instances",
        pattern: "^[0-9]*$",
        validInput: "number of instances",
        minLength: 1,
        maxLength: 100,
        required: true,
    })
    public instances: number;

    @Value("organization", "atomist")
    public organization: string;
    @Value("space", "development")
    public space: string;

    @MappedParameter("atomist://correlation_id")
    public corrId: string;

    public handle(context: HandlerContext): CommandPlan {
        const plan = new CommandPlan();

        const instruction: CommandRespondable<Execute> = {
            instruction: {
                kind: "execute",
                name: "cf-scale",
                parameters: this,
            },
            onSuccess: success(`Successfully scaled \`${this.app}\` to ${this.instances} instances`),
            onError: error(`Failed to scale \`${this.app}\` to ${this.instances} instances`, this.corrId),
        };

        plan.add(instruction);

        return plan;
    }
}

export const scaleApplication = configured(ScaleApplication);
