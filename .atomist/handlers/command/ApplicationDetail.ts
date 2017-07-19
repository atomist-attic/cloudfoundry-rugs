import { CommandHandler,
    Intent,
    MappedParameter,
    Parameter,
    ParseJson,
    ResponseHandler,
    Secrets,
    Tags } from "@atomist/rug/operations/Decorators";
import { CommandPlan,
    DirectedMessage,
    HandleCommand,
    HandlerContext,
    HandleResponse,
    MessageMimeType,
    MessageMimeTypes,
    Response,
    ResponseMessage } from "@atomist/rug/operations/Handlers";
import { Pattern } from "@atomist/rug/operations/RugOperation";
import * as slack from "@atomist/slack-messages/SlackMessages";

import { error } from "../Handlers";

import { Configuration, configured, Value } from "../../config/Configuration";

/**
 * A Scale a Cloud Foundry Application.
 */
@CommandHandler("ApplicationDetail", "Get application detail of a Cloud Foundry Application")
@Tags("cloudfoundry")
@Intent("cf info")
@Secrets(
    "secret://team?path=cloudfoundry/user",
    "secret://team?path=cloudfoundry/password",
)
@Configuration(
    { paths: ["cloudfoundry.json"] },
)
export class ApplicationDetail implements HandleCommand {

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
                name: "cf-info",
                parameters: this,
            },
            onSuccess: {kind: "respond", name: "ApplicationDetailResponder", parameters: this},
            onError: error(`Failed to retrieve application info for \`${this.app}\``, this.corrId),
        });

        return plan;
    }
}

@ResponseHandler("ApplicationDetailResponder", "Sends log entries back")
class ApplicationDetailResponder implements HandleResponse<any> {

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

    public handle(@ParseJson response: Response<any>): CommandPlan {
        const detail = response.body;
        console.log(JSON.stringify(detail, null, 4));
        const routes = detail.urls.map(r => slack.url("http://" + r + "/info", r)).join(", ");

        const message: slack.SlackMessage = {
            text: `Application details for \`${this.app}\``,
            attachments: [{
                fallback: `Application details for \`${this.app}\``,
                mrkdwn_in: [ "value" ],
                footer: detail.buildpack,
                fields: [{
                        title: "Name",
                        value: this.app,
                        short: true,
                    },
                    {
                        title: "Requested State",
                        value: detail.requestedState.toLowerCase(),
                        short: true,
                    },
                    {
                        title: "Usage",
                        value: `${detail.memoryLimit} mb x ${detail.instances} instances`,
                        short: true,
                    },
                    {
                        title: "Routes",
                        value: routes,
                        short: true,
                    },
                    {
                        title: "Last Uploaded",
                        value: detail.lastUploaded,
                        short: true,
                    },
                    {
                        title: "Stack",
                        value: detail.stack,
                        short: true,
                    }],
                },
            ],
        };

        detail.instanceDetails.forEach(i => {
            const attachment: slack.Attachment = {
                fallback: `Instance details for #${i.index}`,
                fields: [{
                    title: "Index",
                    value: i.index,
                    short: true,
                },
                {
                    title: "State",
                    value: i.state.toLowerCase(),
                    short: true,
                },
                {
                    title: "Since",
                    value: i.since,
                    short: true,
                },
                {
                    title: "CPU",
                    value: `${(i.cpu * 100).toFixed(1)}%`,
                    short: true,
                },
                {
                    title: "Memory",
                    value: `${(+i.memoryUsage / 1024 / 1024).toFixed(0)}M of ${detail.memoryLimit}M`,
                    short: true,
                },
                {
                    title: "Disk",
                    value: `${(+i.diskUsage / 1024 / 1024).toFixed(0)}M of ${detail.diskQuota}M`,
                    short: true,
                }],
            };
            message.attachments.push(attachment);
        });

        return CommandPlan.ofMessage(new ResponseMessage(slack.render(message, true), MessageMimeTypes.SLACK_JSON));
    }
}

export const applicationDetailResponder = new ApplicationDetailResponder();
export const applicationDetail = configured(ApplicationDetail);
