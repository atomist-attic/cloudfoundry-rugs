import {
    CommandHandler,
    Intent,
    MappedParameter,
    Parameter,
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
    Response,
    ResponseMessage,
} from "@atomist/rug/operations/Handlers";
import { Pattern } from "@atomist/rug/operations/RugOperation";
import * as PlanUtils from "@atomist/rugs/operations/PlanUtils";
import { renderError } from "@atomist/slack-messages/RugMessages";
import { codeLine, url } from "@atomist/slack-messages/SlackMessages";

import { AddTravisDeploy } from "../../editors/AddTravisDeploy";
import { error } from "../Handlers";

const travisParams = {
    repo: {
        displayName: "GitHub Repository Name",
        description: "a repository to enable Cloud Foundry deployment on",
        pattern: Pattern.any,
        validInput: "valid GitHub repository name",
        minLength: 1,
        maxLength: 100,
    },
    owner: {
        displayName: "GitHub Repository Owner",
        description: "owner of repository to enable Cloud Foundry deployment on",
        pattern: Pattern.any,
        validInput: "valid GitHub repository owner",
        minLength: 1,
        maxLength: 100,
    },
    corrId: {
        displayName: "Atomist Correlation ID",
        description: "unique identifier for a set of connected operations",
        pattern: Pattern.any,
        validInput: "valid Atomist correlation ID",
        minLength: 1,
        maxLength: 100,
    },
};

/**
 * A enable Cloud Foundry deployments on Travis CI.
 */
@CommandHandler("EnableTravisDeploy", "enable Cloud Foundry deployments on Travis CI")
@Tags("travis-ci", "cloud-foundry")
@Intent("enable travis cf")
@Secrets(
    "github://user_token?scopes=repo",
    "github://user_token?scopes=repo,read:org,user:email",
    "secret://team?path=cloudfoundry/user",
    "secret://team?path=cloudfoundry/password",
)
export class EnableTravisDeploy implements HandleCommand {

    @Parameter(AddTravisDeploy.Parameters.applicationName)
    public app: string = "$projectName";

    @Parameter(AddTravisDeploy.Parameters.cfOrg)
    public organization: string;

    @Parameter(AddTravisDeploy.Parameters.cfSpace)
    public space: string;

    @MappedParameter(MappedParameters.GITHUB_REPOSITORY)
    public repo: string;

    @MappedParameter(MappedParameters.GITHUB_REPO_OWNER)
    public owner: string;

    @MappedParameter("atomist://correlation_id")
    public corrId: string;

    public handle(context: HandlerContext): CommandPlan {
        const plan = new CommandPlan();

        const repoUrl = slugUrl(this.repo, this.owner);
        const message = new ResponseMessage(`Enabling deployments to Cloud Foundry on Travis CI for ${repoUrl}...`);
        plan.add(message);

        const encryptUser = PlanUtils.execute("travis-encrypt", {
            repo: this.repo,
            owner: this.owner,
            content: "#{secret://team?path=cloudfoundry/user}",
        });
        encryptUser.onSuccess = {
            kind: "respond",
            name: ReceiveEncryptedUser.Name,
            parameters: {
                applicationName: this.app,
                cfOrg: this.organization,
                cfSpace: this.space,
                repo: this.repo,
                owner: this.owner,
                corrId: this.corrId,
            },
        };
        const errorMsg = `Failed to encrypt Cloud Foundry user for ${repoUrl}.\n`;
        encryptUser.onError = error(errorMsg, this.corrId);
        plan.add(encryptUser);

        return plan;
    }
}

export const enableTravisDeploy = new EnableTravisDeploy();

function slugUrl(repo: string, owner: string): string {
    const slug = `${owner}/${repo}`;
    const repoUrl = url(`https://github.com/${slug}`, codeLine(slug));
    return repoUrl;
}

@ResponseHandler(ReceiveEncryptedUser.Name, "step 2")
@Secrets("secret://team?path=cloudfoundry/password")
class ReceiveEncryptedUser implements HandleResponse<any> {

    public static Name = "ReceiveEncryptedUser";

    @Parameter(AddTravisDeploy.Parameters.applicationName)
    public applicationName: string = "$projectName";

    @Parameter(AddTravisDeploy.Parameters.cfOrg)
    public cfOrg: string;

    @Parameter(AddTravisDeploy.Parameters.cfSpace)
    public cfSpace: string;

    @Parameter(travisParams.repo)
    public repo: string;

    @Parameter(travisParams.owner)
    public owner: string;

    @Parameter(travisParams.corrId)
    public corrId: string;

    public handle(response: Response<string>): CommandPlan {
        const encryptedCFUser: string = response.body;

        const plan = new CommandPlan();

        const repoUrl = slugUrl(this.owner, this.repo);
        const encryptMsg = `${codeLine("[*--]")} Encrypted Cloud Foundry user for ${repoUrl}...`;
        plan.add(new ResponseMessage(encryptMsg));

        const encryptPassword = PlanUtils.execute("travis-encrypt", {
            repo: this.repo,
            owner: this.owner,
            content: "#{secret://team?path=cloudfoundry/password}",
        });
        encryptPassword.onSuccess = {
            kind: "respond",
            name: ReceiveEncryptedPassword.Name,
            parameters: {
                applicationName: this.applicationName,
                cfUser: encryptedCFUser,
                cfOrg: this.cfOrg,
                cfSpace: this.cfSpace,
                repo: this.repo,
                owner: this.owner,
                corrId: this.corrId,
            },
        };
        const errorMsg = `Failed to encrypt Cloud Foundry password for ${repoUrl}.\n`;
        encryptPassword.onError = error(errorMsg, this.corrId);
        plan.add(encryptPassword);

        return plan;
    }
}

export const receiveEncryptedUser = new ReceiveEncryptedUser();

@ResponseHandler(ReceiveEncryptedPassword.Name, "step 3")
@Secrets("secret://team?path=cloudfoundry/user")
class ReceiveEncryptedPassword implements HandleResponse<any> {

    public static Name = "ReceiveEncryptedPassword";

    @Parameter(AddTravisDeploy.Parameters.applicationName)
    public applicationName: string = "$projectName";

    @Parameter(AddTravisDeploy.Parameters.cfUser)
    public cfUser: string;

    @Parameter(AddTravisDeploy.Parameters.cfOrg)
    public cfOrg: string;

    @Parameter(AddTravisDeploy.Parameters.cfSpace)
    public cfSpace: string;

    @Parameter(travisParams.repo)
    public repo: string;

    @Parameter(travisParams.owner)
    public owner: string;

    @Parameter(travisParams.corrId)
    public corrId: string;

    public handle(response: Response<string>): CommandPlan {
        const encryptedCFPassword: string = response.body;

        const plan = new CommandPlan();

        const repoUrl = slugUrl(this.owner, this.repo);
        const encryptMsg = `${codeLine("[**-]")} Encrypted Cloud Foundry password for ${repoUrl}...`;
        plan.add(new ResponseMessage(encryptMsg));

        const successMsg = `${codeLine("[***]")} Updated Travis CI configuration for Cloud Foundry deployment...\n` +
            `Done! Accept my PR to merge the changes into ${codeLine("master")}.`;
        const errorMsg = `Failed to update Travis CI configuration for Cloud Foundry deployment for ${repoUrl}.\n`;
        const editorParameters = {
            applicationName: this.applicationName,
            cfUser: this.cfUser,
            cfPassword: encryptedCFPassword,
            cfOrg: this.cfOrg,
            cfSpace: this.cfSpace,
        };
        const addTravisDeploy = {
            instruction: {
                kind: "edit",
                name: AddTravisDeploy.Name,
                project: this.repo,
                parameters: editorParameters,
            },
            onSuccess: new ResponseMessage(successMsg),
            onError: error(errorMsg, this.corrId),
        };
        plan.add(addTravisDeploy);

        return plan;
    }
}

export const receiveEncryptedPassword = new ReceiveEncryptedPassword();
