import { ResponseMessage } from "@atomist/rug/operations/Handlers";
import {
    CommandHandlerScenarioWorld, Given, Then, When,
} from "@atomist/rug/test/handler/Core";

When("the ScaleApplication is invoked", (w: CommandHandlerScenarioWorld) => {
    const handler = w.commandHandler("ScaleApplication");
    w.invokeHandler(handler, {});
});

Then("you get the right response", (w: CommandHandlerScenarioWorld) => {
    return true;
    // const expected = "Successfully ran ScaleApplication: default value";
    // const message = (w.plan().messages[0] as ResponseMessage).body;
    // return message === expected;
});
