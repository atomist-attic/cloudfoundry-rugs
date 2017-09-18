Feature: Add Cloud Foundry deployment files
  This is the sample Gherkin feature file for the BDD tests of
  the add files needed to deploy to Cloud Foundry from Travis CI.
  Feel free to modify and extend to suit the needs of your editor.


  Scenario: AddTravisDeploy should edit a project correctly
    Given a project with a .travis.yml
    When the AddTravisDeploy is run
    Then parameters were valid
    Then changes were made
    Then file at .travis.yml should exist
    Then file at .travis.yml should contain provider: cloudfoundry
    Then file at .travis.yml should contain secure: paul@westerberg.com
    Then file at .travis.yml should contain secure: HOOTENANNY/LET0IT0BE/TIM/PLEASED0TO0MEET0ME
    Then file at .travis.yml should contain organization: minneapolis
    Then file at .travis.yml should contain space: first-avenue
    Then file at .travis.yml should contain branch: master
    Then file at .travis.yml should contain before_deploy:
    Then file at manifest.yml should exist
    Then file at manifest.yml should contain - name: "@NAME@"
    Then file at manifest.yml should contain path: "@PATH@"
    # Then dump files
