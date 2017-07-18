import { Project } from "@atomist/rug/model/Project";
import {
    Given, ProjectScenarioWorld, Then, When,
} from "@atomist/rug/test/project/Core";

const params = {
    applicationName: "the-replacements",
    cfUser: "paul@westerberg.com",
    cfPassword: "HOOTENANNY/LET0IT0BE/TIM/PLEASED0TO0MEET0ME",
    cfOrg: "minneapolis",
    cfSpace: "first-avenue",
};

Given("a project with a .travis.yml", (p: Project, w: ProjectScenarioWorld) => {
    p.addFile(".travis.yml", `dist: trusty
sudo: false
language: java
jdk:
- oraclejdk8
`);
});

When("the AddTravisDeploy is run", (p: Project, w: ProjectScenarioWorld) => {
    const editor = w.editor("AddTravisDeploy");
    w.editWith(editor, params);
});

Then("dump manifest.yml", (p: Project, w: ProjectScenarioWorld) => {
    console.log(`.travis.yml:\n${p.findFile(".travis.yml").content}`);
    console.log(`manifest.yml:\n${p.findFile("manifest.yml").content}`);
    return true;
});
