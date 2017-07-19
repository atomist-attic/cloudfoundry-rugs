import { File, Project } from "@atomist/rug/model/Core";
import { Editor, Parameter, Tags } from "@atomist/rug/operations/Decorators";
import { EditProject } from "@atomist/rug/operations/ProjectEditor";
import { Pattern } from "@atomist/rug/operations/RugOperation";

const cfValidationRegExp = "^[A-Za-z](?:[\\-\\w]*\\w)*$";

/**
 * Sample TypeScript editor used by AddAddTravisDeploy.
 */
@Editor(AddTravisDeploy.Name, "add files needed to deploy to Cloud Foundry from Travis CI")
@Tags("travis-ci", "cloud-foundry")
export class AddTravisDeploy implements EditProject {

    public static Name = "AddTravisDeploy";

    public static Parameters = {
        applicationName: {
            displayName: "Application Name",
            description: "Cloud Foundry application name, use `$projectName` to set it to the name of your project",
            pattern: "^(?:[A-Za-z0-9](?:[-\\w]*[A-Za-z0-9])*|\\$projectName)$",
            validInput: "a valid Cloud Foundry application name, beginning and ending with an alphanumeric character"
            + " and containing alphanumeric, _, and - characters",
            minLength: 1,
            maxLength: 100,
            required: false,
        },
        cfUser: {
            displayName: "Cloud Foundry User",
            description: "encrypted user name (email address) of Cloud Foundry user with deploy permissions",
            pattern: Pattern.any,
            validInput: "an encrypted valid Cloud Foundry user email address with deploy permissions",
            minLength: 1,
            maxLength: 1000,
        },
        cfPassword: {
            displayName: "Cloud Foundry Password",
            description: "encrypted Cloud Foundry password for user with deploy permissions",
            pattern: Pattern.any,
            validInput: "an encrypted valid password for a Cloud Foundry user with deploy permissions",
            minLength: 1,
            maxLength: 1000,
        },
        cfOrg: {
            displayName: "Cloud Foundry Organization",
            description: "Cloud Foundry organization to deploy under",
            pattern: cfValidationRegExp,
            validInput: "a valid Cloud Foundry organization",
            minLength: 1,
            maxLength: 100,
        },
        cfSpace: {
            displayName: "Cloud Foundry Space",
            description: "Cloud Foundry space to deploy to",
            pattern: cfValidationRegExp,
            validInput: "a valid Cloud Foundry space",
            minLength: 1,
            maxLength: 100,
        },
    };

    @Parameter(AddTravisDeploy.Parameters.applicationName)
    public applicationName: string = "$projectName";

    @Parameter(AddTravisDeploy.Parameters.cfUser)
    public cfUser: string;

    @Parameter(AddTravisDeploy.Parameters.cfPassword)
    public cfPassword: string;

    @Parameter(AddTravisDeploy.Parameters.cfOrg)
    public cfOrg: string;

    @Parameter(AddTravisDeploy.Parameters.cfSpace)
    public cfSpace: string;

    public edit(project: Project) {
        const travisYaml = project.findFile(".travis.yml");
        if (!travisYaml) {
            console.log(`project ${project.name} has no '.travis.yaml' file`);
            return;
        }

        const travisConfig = travisYaml.content;
        if (/provider:\s*cloudfoundry/.test(travisConfig)) {
            console.log(`project ${project.name} already configured for Cloud Foundry deployments from Travis CI`);
        } else {
            const updatedTravisYaml = ((/\n$/.test(travisConfig)) ? travisConfig : travisConfig + "\n") +
                travisDeployContent(this.cfUser, this.cfPassword, this.cfOrg, this.cfSpace, project.name);
            travisYaml.setContent(updatedTravisYaml);
        }

        if (project.fileExists("manifest.yml")) {
            console.log(`project ${project.name} already has a manifest.yml, not overwriting`);
        } else {
            const name = (this.applicationName === "$projectName") ? project.name : this.applicationName;
            project.addFile("manifest.yml", manifestYamlContent(name, project.name));
        }
    }
}

export const addTravisDeploy = new AddTravisDeploy();

function manifestYamlContent(name: string, artifact: string): string {
    return `---
applications:
- name: ${name}
  memory: 512M
  instances: 1
  path: target/${artifact}-VERSION.jar

`;
}

function travisDeployContent(
    user: string,
    password: string,
    organization: string,
    space: string,
    artifact: string,
): string {
    return `deploy:
  provider: cloudfoundry
  api: https://api.run.pivotal.io
  username:
    secure: ${user}
  password:
    secure: ${password}
  organization: ${organization}
  space: ${space}
  skip_cleanup: true
  on:
    tags: true
    condition: $TRAVIS_TAG =~ ^[0-9]+\\.[0-9]+\\.[0-9]+$
before_deploy: sed -i -e "s/VERSION/$TRAVIS_TAG/g" manifest.yml
`;
}
