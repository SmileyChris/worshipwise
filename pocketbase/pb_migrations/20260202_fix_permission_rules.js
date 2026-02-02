/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Fix Permission-Based Collection Rules
 *
 * The original rules used an incorrect path:
 *   @request.auth.church_memberships_via_user_id.user_roles_via_user_id...
 *
 * This is wrong because user_roles references users directly, not through church_memberships.
 *
 * The correct path is:
 *   @request.auth.user_roles_via_user_id...
 *
 * We also need to verify the user is a member of the church AND has the permission through user_roles.
 */

migrate((app) => {
    // Helper to build permission check rule
    const hasPermission = (permission) =>
        `@request.auth.church_memberships_via_user_id.church_id ?= church_id && ` +
        `@request.auth.user_roles_via_user_id.church_id ?= church_id && ` +
        `@request.auth.user_roles_via_user_id.role_id.permissions ?~ '${permission}'`;

    // Fix roles collection rules
    const roles = app.findCollectionByNameOrId("roles");
    if (roles) {
        roles.createRule = hasPermission('manage-church');
        roles.updateRule = hasPermission('manage-church');
        roles.deleteRule = hasPermission('manage-church') + " && is_builtin = false";
        app.save(roles);
        console.log("Fixed roles collection rules");
    }

    // Fix user_roles collection rules
    const userRoles = app.findCollectionByNameOrId("user_roles");
    if (userRoles) {
        userRoles.createRule = hasPermission('manage-members');
        userRoles.updateRule = hasPermission('manage-members');
        userRoles.deleteRule = hasPermission('manage-members');
        app.save(userRoles);
        console.log("Fixed user_roles collection rules");
    }

    // Fix skills collection rules
    const skills = app.findCollectionByNameOrId("skills");
    if (skills) {
        skills.createRule = hasPermission('manage-members');
        skills.updateRule = hasPermission('manage-members');
        skills.deleteRule = hasPermission('manage-members') + " && is_builtin = false";
        app.save(skills);
        console.log("Fixed skills collection rules");
    }

    // Fix user_skills collection rules
    const userSkills = app.findCollectionByNameOrId("user_skills");
    if (userSkills) {
        userSkills.createRule = hasPermission('manage-members');
        userSkills.updateRule = hasPermission('manage-members');
        userSkills.deleteRule = hasPermission('manage-members');
        app.save(userSkills);
        console.log("Fixed user_skills collection rules");
    }

    console.log("Permission rules migration complete!");

}, (app) => {
    // Revert to original (broken) rules - not really useful but required for migration
    const brokenRule = (permission) =>
        `@request.auth.church_memberships_via_user_id.church_id ?= church_id && ` +
        `@request.auth.church_memberships_via_user_id.user_roles_via_user_id.role_id.permissions ?~ '${permission}'`;

    const roles = app.findCollectionByNameOrId("roles");
    if (roles) {
        roles.createRule = brokenRule('manage-church');
        roles.updateRule = brokenRule('manage-church');
        roles.deleteRule = brokenRule('manage-church') + " && is_builtin = false";
        app.save(roles);
    }

    const userRoles = app.findCollectionByNameOrId("user_roles");
    if (userRoles) {
        userRoles.createRule = brokenRule('manage-members');
        userRoles.updateRule = brokenRule('manage-members');
        userRoles.deleteRule = brokenRule('manage-members');
        app.save(userRoles);
    }

    const skills = app.findCollectionByNameOrId("skills");
    if (skills) {
        skills.createRule = brokenRule('manage-members');
        skills.updateRule = brokenRule('manage-members');
        skills.deleteRule = brokenRule('manage-members') + " && is_builtin = false";
        app.save(skills);
    }

    const userSkills = app.findCollectionByNameOrId("user_skills");
    if (userSkills) {
        userSkills.createRule = brokenRule('manage-members');
        userSkills.updateRule = brokenRule('manage-members');
        userSkills.deleteRule = brokenRule('manage-members');
        app.save(userSkills);
    }

    console.log("Permission rules reverted to original");
});
