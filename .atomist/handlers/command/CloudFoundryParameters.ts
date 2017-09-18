export const CloudFoundryParameters = {
    app: {
        displayName: "Application Name",
        description: "name of Cloud Foundry application",
        pattern: "^.+$",
        validInput: "a valid Cloud Foundry application name",
        minLength: 1,
        maxLength: 100,
        required: true,
    },
    space: {
        displayName: "Application Space",
        description: "name of Cloud Foundry space app is deployed to",
        pattern: "^.+$",
        validInput: "a valid Cloud Foundry space name",
        minLength: 1,
        maxLength: 100,
        required: true,
    },
};

export function qualifiedAppName(app: string, org: string, space: string): string {
    return `\`${app}\` in org \`${org}\` and space \`${space}\``;
}
