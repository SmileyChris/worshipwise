/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Seed Default Roles for Existing Churches
 *
 * The church_setup.pb.js hook creates default roles and skills for NEW churches,
 * but existing churches don't have them. This migration ensures all churches
 * have the Administrator role and Worship Leader skill.
 */

migrate((app) => {
    const rolesCollection = app.findCollectionByNameOrId("roles");
    const skillsCollection = app.findCollectionByNameOrId("skills");

    // Get all churches
    const churches = app.findRecordsByFilter("churches", "1=1", "", 0, 0);

    console.log(`Processing ${churches.length} church(es) for default roles/skills...`);

    for (const church of churches) {
        const churchId = church.id;

        // 1. Create Administrator Role if it doesn't exist
        try {
            app.findFirstRecordByFilter("roles", `church_id = "${churchId}" && slug = "admin"`);
            console.log(`Church ${churchId}: Admin role already exists`);
        } catch (err) {
            const adminRole = new Record(rolesCollection);
            adminRole.set("church_id", churchId);
            adminRole.set("name", "Administrator");
            adminRole.set("slug", "admin");
            adminRole.set("permissions", [
                "manage-songs",
                "manage-services",
                "manage-members",
                "manage-church"
            ]);
            adminRole.set("is_builtin", true);
            app.save(adminRole);
            console.log(`Church ${churchId}: Created Administrator role`);
        }

        // 2. Create Worship Leader Skill if it doesn't exist
        try {
            app.findFirstRecordByFilter("skills", `church_id = "${churchId}" && slug = "leader"`);
            console.log(`Church ${churchId}: Leader skill already exists`);
        } catch (err) {
            const leaderSkill = new Record(skillsCollection);
            leaderSkill.set("church_id", churchId);
            leaderSkill.set("name", "Worship Leader");
            leaderSkill.set("slug", "leader");
            leaderSkill.set("is_builtin", true);
            app.save(leaderSkill);
            console.log(`Church ${churchId}: Created Worship Leader skill`);
        }

        // 3. Assign Admin role to church owner if not already assigned
        const ownerUserId = church.getString("owner_user_id");
        if (ownerUserId) {
            try {
                const adminRole = app.findFirstRecordByFilter("roles", `church_id = "${churchId}" && slug = "admin"`);

                try {
                    app.findFirstRecordByFilter("user_roles", `church_id = "${churchId}" && user_id = "${ownerUserId}" && role_id = "${adminRole.id}"`);
                    console.log(`Church ${churchId}: Owner already has admin role`);
                } catch (notAssigned) {
                    const userRolesCollection = app.findCollectionByNameOrId("user_roles");
                    const userRole = new Record(userRolesCollection);
                    userRole.set("church_id", churchId);
                    userRole.set("user_id", ownerUserId);
                    userRole.set("role_id", adminRole.id);
                    app.save(userRole);
                    console.log(`Church ${churchId}: Assigned admin role to owner ${ownerUserId}`);
                }
            } catch (err) {
                console.error(`Church ${churchId}: Failed to assign admin role to owner:`, err);
            }
        }

        // 4. Assign Leader skill to church owner if not already assigned
        if (ownerUserId) {
            try {
                const leaderSkill = app.findFirstRecordByFilter("skills", `church_id = "${churchId}" && slug = "leader"`);

                try {
                    app.findFirstRecordByFilter("user_skills", `church_id = "${churchId}" && user_id = "${ownerUserId}" && skill_id = "${leaderSkill.id}"`);
                    console.log(`Church ${churchId}: Owner already has leader skill`);
                } catch (notAssigned) {
                    const userSkillsCollection = app.findCollectionByNameOrId("user_skills");
                    const userSkill = new Record(userSkillsCollection);
                    userSkill.set("church_id", churchId);
                    userSkill.set("user_id", ownerUserId);
                    userSkill.set("skill_id", leaderSkill.id);
                    app.save(userSkill);
                    console.log(`Church ${churchId}: Assigned leader skill to owner ${ownerUserId}`);
                }
            } catch (err) {
                console.error(`Church ${churchId}: Failed to assign leader skill to owner:`, err);
            }
        }
    }

    console.log("Default roles/skills migration complete!");
}, (app) => {
    // Down migration: Remove auto-created roles and skills
    // Note: This won't remove manually created ones since we only track is_builtin
    console.log("Removing auto-created roles and skills...");

    const churches = app.findRecordsByFilter("churches", "1=1", "", 0, 0);

    for (const church of churches) {
        const churchId = church.id;

        // Remove builtin admin role and its user_roles
        try {
            const adminRole = app.findFirstRecordByFilter("roles", `church_id = "${churchId}" && slug = "admin" && is_builtin = true`);

            // Remove user_roles referencing this role
            const userRoles = app.findRecordsByFilter("user_roles", `role_id = "${adminRole.id}"`, "", 0, 0);
            for (const ur of userRoles) {
                app.delete(ur);
            }

            app.delete(adminRole);
            console.log(`Church ${churchId}: Removed admin role`);
        } catch (err) {
            // Role doesn't exist, skip
        }

        // Remove builtin leader skill and its user_skills
        try {
            const leaderSkill = app.findFirstRecordByFilter("skills", `church_id = "${churchId}" && slug = "leader" && is_builtin = true`);

            // Remove user_skills referencing this skill
            const userSkills = app.findRecordsByFilter("user_skills", `skill_id = "${leaderSkill.id}"`, "", 0, 0);
            for (const us of userSkills) {
                app.delete(us);
            }

            app.delete(leaderSkill);
            console.log(`Church ${churchId}: Removed leader skill`);
        } catch (err) {
            // Skill doesn't exist, skip
        }
    }

    console.log("Rollback complete!");
});
