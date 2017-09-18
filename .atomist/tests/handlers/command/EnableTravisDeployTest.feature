Feature: EnableTravisDeploy handlers responds to commands
  The EnableTravisDeploy should create a proper plan, responding with
  a message and instruction to encrypt the Cloud Foundry password and
  update the Travis CI files on success.


  Scenario: EnableTravisDeploy happy path
    Given nothing
    When the EnableTravisDeploy is invoked
    Then handler parameters were valid
    Then you get a plan to encrypt and update
