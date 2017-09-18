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
    DirectedMessage,
    HandleCommand,
    HandlerContext,
    HandleResponse,
    MappedParameters,
    MessageMimeTypes,
    Response,
    ResponseMessage,
    UserAddress,
} from "@atomist/rug/operations/Handlers";
import { Pattern } from "@atomist/rug/operations/RugOperation";
import * as slack from "@atomist/slack-messages/SlackMessages";

import { error } from "../Handlers";

import { Configuration, configured, Value } from "../../config/Configuration";
import { CloudFoundryParameters, qualifiedAppName } from "./CloudFoundryParameters";

/**
 * A Scale a Cloud Foundry Application.
 */
@CommandHandler("RecentLogs", "Get recent logs of a Cloud Foundry application")
@Tags("cloudfoundry")
@Intent("cf recentlogs")
@Secrets(
    "secret://team?path=cloudfoundry/user",
    "secret://team?path=cloudfoundry/password",
)
@Configuration(
    { paths: ["cloudfoundry.json"] },
)
export class RecentLogs implements HandleCommand {

    @Parameter(CloudFoundryParameters.app)
    public app: string;

    @Parameter(CloudFoundryParameters.space)
    public space: string;

    @Value("organization", "atomist")
    public organization: string;

    @MappedParameter("atomist://correlation_id")
    public corrId: string;

    @MappedParameter(MappedParameters.SLACK_USER_NAME)
    public requester: string;

    public handle(context: HandlerContext): CommandPlan {
        const plan = new CommandPlan();

        const appPhrase = qualifiedAppName(this.app, this.organization, this.space);

        plan.add({
            instruction: {
                kind: "execute",
                name: "cf-recentlogs",
                parameters: this,
            },
            onSuccess: { kind: "respond", name: "RecentLogsResponder", parameters: this },
            onError: error(`Failed to retrieve logs for ${appPhrase}`, this.corrId),
        });

        return plan;
    }
}

@ResponseHandler("RecentLogsResponder", "Sends log entries back")
class RecentLogsResponder implements HandleResponse<any> {
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

    @Parameter({
        displayName: "",
        description: "",
        pattern: Pattern.any,
        validInput: "a valid CloudFoundry application name",
        minLength: 1,
        maxLength: 100,
        required: true,
    })
    public requester: string;

    public handle( @ParseJson response: Response<any>): CommandPlan {
        const plan = new CommandPlan();
        const lines = response.body;
        const message: slack.SlackMessage = {
            text: `Recent logs for \`${this.app}\``,
            attachments: [],
        };
        plan.add(new ResponseMessage(`Direct messaging application logs of \`${this.app}\` to @${this.requester}`));
        plan.add(new DirectedMessage(slack.render(message),
            new UserAddress(this.requester), MessageMimeTypes.SLACK_JSON));

        let i = 0;
        let j = lines.length;
        const chunks = [];
        const chunk = 5;
        for (i = 0, j = lines.length; i < j; i += chunk) {
            chunks.push(lines.slice(i, i + chunk));
        }
        chunks.forEach(c => {
            plan.add(new DirectedMessage(slack.codeBlock(slack.escape(c.join("\n"))),
                new UserAddress(this.requester), MessageMimeTypes.PLAIN_TEXT));
        });
        return plan;
    }
}

export const recentLogsResponder = new RecentLogsResponder();
export const recentLogs = configured(RecentLogs);
