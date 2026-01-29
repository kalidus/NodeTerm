// Favorite Groups Store - Manages custom groups for organizing favorites
// Supports localStorage + ready for cloud sync

const GROUPS_KEY = 'nodeterm_favorite_groups';
const UPDATED_EVENT = 'favorite-groups-updated';

// Default groups that always exist
const DEFAULT_GROUPS = [
    { id: 'all', name: 'Todos', icon: 'pi-star', color: '#FFD700', isDefault: true, order: 0 }
];

function safeParse(json, fallback) {
    try {
        if (!json) return fallback;
        return JSON.parse(json);
    } catch (_) {
        return fallback;
    }
}

function loadGroups() {
    const saved = safeParse(localStorage.getItem(GROUPS_KEY), []);
    // Always ensure default groups exist at the beginning
    const defaultIds = DEFAULT_GROUPS.map(g => g.id);
    const userGroups = saved.filter(g => !defaultIds.includes(g.id));
    return [...DEFAULT_GROUPS, ...userGroups];
}

function saveGroups(groups) {
    // Don't save default groups, only user-created ones
    const userGroups = groups.filter(g => !g.isDefault);
    localStorage.setItem(GROUPS_KEY, JSON.stringify(userGroups));
    window.dispatchEvent(new CustomEvent(UPDATED_EVENT, { detail: { groups } }));
}

// Get all groups (including defaults)
export function getGroups() {
    return loadGroups();
}

// Get user-created groups only
export function getUserGroups() {
    return loadGroups().filter(g => !g.isDefault);
}

// Create a new group
export function createGroup({ name, icon = 'pi-folder', color = '#4fc3f7' }) {
    if (!name || !name.trim()) {
        throw new Error('El nombre del grupo es requerido');
    }

    const groups = loadGroups();

    // Check for duplicate names
    if (groups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('Ya existe un grupo con ese nombre');
    }

    const newGroup = {
        id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        icon,
        color,
        isDefault: false,
        order: groups.length,
        createdAt: new Date().toISOString()
    };

    groups.push(newGroup);
    saveGroups(groups);
    return newGroup;
}

// Update an existing group
export function updateGroup(groupId, updates) {
    const groups = loadGroups();
    const idx = groups.findIndex(g => g.id === groupId);

    if (idx < 0) {
        throw new Error('Grupo no encontrado');
    }

    if (groups[idx].isDefault) {
        throw new Error('No se pueden modificar los grupos por defecto');
    }

    // Check for duplicate names if name is being changed
    if (updates.name && updates.name !== groups[idx].name) {
        if (groups.some(g => g.id !== groupId && g.name.toLowerCase() === updates.name.toLowerCase())) {
            throw new Error('Ya existe un grupo con ese nombre');
        }
    }

    groups[idx] = { ...groups[idx], ...updates, updatedAt: new Date().toISOString() };
    saveGroups(groups);
    return groups[idx];
}

// Delete a group
export function deleteGroup(groupId) {
    const groups = loadGroups();
    const group = groups.find(g => g.id === groupId);

    if (!group) {
        throw new Error('Grupo no encontrado');
    }

    if (group.isDefault) {
        throw new Error('No se pueden eliminar los grupos por defecto');
    }

    const filtered = groups.filter(g => g.id !== groupId);
    saveGroups(filtered);

    // Also remove this group from any favorites that have it
    removeFavoriteGroupAssignments(groupId);

    return filtered;
}

// Reorder groups
export function reorderGroups(newOrderList) {
    const reordered = newOrderList.map((g, index) => ({ ...g, order: index }));
    saveGroups(reordered);
    return reordered;
}

// Get a specific group by ID
export function getGroupById(groupId) {
    return loadGroups().find(g => g.id === groupId) || null;
}

// ============================================
// Favorite-Group Assignments
// ============================================

const ASSIGNMENTS_KEY = 'nodeterm_favorite_group_assignments';

function loadAssignments() {
    return safeParse(localStorage.getItem(ASSIGNMENTS_KEY), {});
}

function saveAssignments(assignments) {
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
    window.dispatchEvent(new CustomEvent(UPDATED_EVENT, { detail: { assignments } }));
}

// Get all groups for a specific favorite
export function getFavoriteGroups(favoriteId) {
    const assignments = loadAssignments();
    return assignments[favoriteId] || [];
}

// Assign a favorite to one or more groups
export function assignFavoriteToGroups(favoriteId, groupIds) {
    const assignments = loadAssignments();
    assignments[favoriteId] = [...new Set(groupIds)]; // Remove duplicates
    saveAssignments(assignments);
    return assignments[favoriteId];
}

// Add a favorite to a single group (without removing from others)
export function addFavoriteToGroup(favoriteId, groupId) {
    const assignments = loadAssignments();
    const current = assignments[favoriteId] || [];
    if (!current.includes(groupId)) {
        current.push(groupId);
        assignments[favoriteId] = current;
        saveAssignments(assignments);
    }
    return assignments[favoriteId];
}

// Remove a favorite from a specific group
export function removeFavoriteFromGroup(favoriteId, groupId) {
    const assignments = loadAssignments();
    if (assignments[favoriteId]) {
        assignments[favoriteId] = assignments[favoriteId].filter(id => id !== groupId);
        if (assignments[favoriteId].length === 0) {
            delete assignments[favoriteId];
        }
        saveAssignments(assignments);
    }
    return assignments[favoriteId] || [];
}

// Remove all assignments for a deleted group
function removeFavoriteGroupAssignments(groupId) {
    const assignments = loadAssignments();
    let changed = false;

    for (const favoriteId in assignments) {
        const idx = assignments[favoriteId].indexOf(groupId);
        if (idx >= 0) {
            assignments[favoriteId].splice(idx, 1);
            if (assignments[favoriteId].length === 0) {
                delete assignments[favoriteId];
            }
            changed = true;
        }
    }

    if (changed) {
        saveAssignments(assignments);
    }
}

// Get all favorites in a specific group
export function getFavoritesInGroup(groupId, allFavorites) {
    if (groupId === 'all') {
        return allFavorites;
    }

    const assignments = loadAssignments();
    return allFavorites.filter(fav => {
        const groups = assignments[fav.id] || [];
        return groups.includes(groupId);
    });
}

// Check if a favorite belongs to a specific group
export function isFavoriteInGroup(favoriteId, groupId) {
    if (groupId === 'all') return true;
    const assignments = loadAssignments();
    return (assignments[favoriteId] || []).includes(groupId);
}

// Subscribe to changes
export function onGroupsUpdate(handler) {
    const listener = (e) => handler(e?.detail);
    window.addEventListener(UPDATED_EVENT, listener);
    return () => window.removeEventListener(UPDATED_EVENT, listener);
}

// Count favorites per group
export function countFavoritesPerGroup(allFavorites) {
    const assignments = loadAssignments();
    const counts = { all: allFavorites.length };

    const groups = loadGroups();
    groups.forEach(g => {
        if (g.id !== 'all') {
            counts[g.id] = 0;
        }
    });

    for (const fav of allFavorites) {
        const favGroups = assignments[fav.id] || [];
        for (const gId of favGroups) {
            if (counts[gId] !== undefined) {
                counts[gId]++;
            }
        }
    }

    return counts;
}

export default {
    getGroups,
    getUserGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    reorderGroups,
    getGroupById,
    getFavoriteGroups,
    assignFavoriteToGroups,
    addFavoriteToGroup,
    removeFavoriteFromGroup,
    getFavoritesInGroup,
    isFavoriteInGroup,
    onGroupsUpdate,
    countFavoritesPerGroup
};
