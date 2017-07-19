import { CommandRespondable, Execute, Respond, ResponseMessage } from "@atomist/rug/operations/Handlers";
import {
    CommandHandlerScenarioWorld, Given, Then, When,
} from "@atomist/rug/test/handler/Core";

const params = {
    applicationName: "i-use-to-want-to-be-a-real-man",
    cfOrg: "the-nashville-sound",
    cfSpace: "hope-the-high-road",
    repo: "the-400-unit",
    owner: "jason-isbell",
    corrId: "0234ef3-445ad30b9c-239cfad023de01a0",
};

When("the EnableTravisDeploy is invoked", (w: CommandHandlerScenarioWorld) => {
    const handler = w.commandHandler("EnableTravisDeploy");
    w.invokeHandler(handler, params);
});

Then("you get a plan to encrypt and update", (w: CommandHandlerScenarioWorld) => {
    const slug = `${params.owner}/${params.repo}`;
    const expected = `Enabling deployments to Cloud Foundry on Travis CI for ` +
        `<https://github.com/${slug}|\`${slug}\`>...`;
    const message = (w.plan().messages[0] as ResponseMessage).body;
    const cre = w.plan().instructions[0] as CommandRespondable<Execute>;
    const instruction = cre.instruction;
    const ip = instruction.parameters as any;
    const success = cre.onSuccess as Respond;
    const sp = success.parameters as any;
    return w.plan().messages.length === 1
        && w.plan().instructions.length === 1
        && message === expected
        && instruction.kind === "execute"
        && instruction.name === "travis-encrypt"
        && instruction.kind === "execute"
        && ip.repo === params.repo
        && ip.owner === params.owner
        && ip.content === "#{secret://team?path=cloudfoundry/user}"
        && success.kind === "respond"
        && success.name === "ReceiveEncryptedUser"
        && sp.applicationName === params.applicationName
        && sp.cfOrg === params.cfOrg
        && sp.cfSpace === params.cfSpace
        && sp.repo === params.repo
        && sp.owner === params.owner
        && sp.corrId === params.corrId;
});
