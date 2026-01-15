/// <reference path="../pb_data/types.d.ts" />

/**
 * Church Setup Hook
 * 
 * Automatically creates default roles and skills when a new church is created.
 * Automatically assigns the "Administrator" role to the church owner when they join.
 */

onRecordAfterCreateSuccess((e) => {
    const church = e.record;
    
    try {
        // 1. Create Administrator Role
        // Check if it already exists (defensive)
        try {
            $app.findFirstRecordByFilter("roles", `church_id = "${church.id}" && slug = "admin"`);
        } catch (err) {
            const rolesCollection = $app.findCollectionByNameOrId("roles");
            const adminRole = new Record(rolesCollection);
            adminRole.set("church_id", church.id);
            adminRole.set("name", "Administrator");
            adminRole.set("slug", "admin");
            adminRole.set("permissions", [
                "manage-songs",
                "manage-services", 
                "manage-members",
                "manage-church"
            ]);
            adminRole.set("is_builtin", true);
            $app.save(adminRole);
        }

        // 2. Create Worship Leader Skill
        try {
            $app.findFirstRecordByFilter("skills", `church_id = "${church.id}" && slug = "leader"`);
        } catch (err) {
            const skillsCollection = $app.findCollectionByNameOrId("skills");
            const leaderSkill = new Record(skillsCollection);
            leaderSkill.set("church_id", church.id);
            leaderSkill.set("name", "Worship Leader");
            leaderSkill.set("slug", "leader");
            leaderSkill.set("is_builtin", true);
            $app.save(leaderSkill);
        }

    } catch (err) {
        $app.logger().error(`Failed to setup defaults for church ${church.id}:`, err);
    }
}, "churches");


onRecordAfterCreateSuccess((e) => {
    const membership = e.record;
    
    try {
        const churchId = membership.getString("church_id");
        const userId = membership.getString("user_id");

        // Fetch church to check owner
        const church = $app.findRecordById("churches", churchId);
        
        if (church.getString("owner_user_id") === userId) {
            // This is the owner joining, assign Admin role
            try {
                const adminRole = $app.findFirstRecordByFilter("roles", `church_id = "${churchId}" && slug = "admin"`);
                
                // Check if already assigned (defensive)
                try {
                    $app.findFirstRecordByFilter("user_roles", `church_id = "${churchId}" && user_id = "${userId}" && role_id = "${adminRole.id}"`);
                } catch (notAssigned) {
                    const userRolesCollection = $app.findCollectionByNameOrId("user_roles");
                    const userRole = new Record(userRolesCollection);
                    userRole.set("church_id", churchId);
                    userRole.set("user_id", userId);
                    userRole.set("role_id", adminRole.id);
                    $app.save(userRole);
                }

                // Also assign Leader skill to the owner for convenience
                const leaderSkill = $app.findFirstRecordByFilter("skills", `church_id = "${churchId}" && slug = "leader"`);
                try {
                    $app.findFirstRecordByFilter("user_skills", `church_id = "${churchId}" && user_id = "${userId}" && skill_id = "${leaderSkill.id}"`);
                } catch (notAssigned) {
                    const userSkillsCollection = $app.findCollectionByNameOrId("user_skills");
                    const userSkill = new Record(userSkillsCollection);
                    userSkill.set("church_id", churchId);
                    userSkill.set("user_id", userId);
                    userSkill.set("skill_id", leaderSkill.id);
                    $app.save(userSkill);
                }

            } catch (err) {
                $app.logger().warn(`Failed to assign default role/skill to owner ${userId}:`, err);
            }
        }
    } catch (err) {
        $app.logger().error(`Error in church_memberships hook:`, err);
    }
}, "church_memberships");
