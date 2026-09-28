// Favorite Groups Store - Manages custom groups for organizing favorites
// Supports localStorage + ready for cloud sync

const GROUPS_KEY = 'nodeterm_favorite_groups';
const FILTER_CONFIG_KEY = 'nodeterm_filter_config';
const UPDATED_EVENT = 'favorite-groups-updated';

// Protocol filters (predefined, but configurable visibility/order)
const PROTOCOL_FILTERS = [
    { id: 'all', type: 'protocol', label: 'Todas', icon: 'pi-th-large', color: '#9E9E9E', isProtocol: true, isDefault: true },
    { id: 'ssh', type: 'protocol', label: 'SSH', icon: 'pi-server', color: '#4fc3f7', isProtocol: true },
    { id: 'rdp-guacamole', type: 'protocol', label: 'RDP', icon: 'pi-desktop', color: '#ff6b35', isProtocol: true },
    { id: 'vnc-guacamole', type: 'protocol', label: 'VNC', icon: 'pi-desktop', color: '#81c784', isProtocol: true },
    { id: 'sftp', type: 'protocol', label: 'SFTP', icon: 'pi-folder-open', color: '#FFB300', isProtocol: true },
    { id: 'secret', type: 'protocol', label: 'Secretos', icon: 'pi-key', color: '#E91E63', isProtocol: true },
];

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

function normalizeParentId(parentId) {
    if (!parentId || parentId === 'all') return null;
    return parentId;
}

function getGroupParentId(group) {
    return normalizeParentId(group?.parentId);
}

function collectDescendantGroupIds(groups, groupId) {
    const ids = [];
    const walk = (parentId) => {
        for (const group of groups || []) {
            if (group.isDefault) continue;
            if (getGroupParentId(group) === parentId) {
                ids.push(group.id);
                walk(group.id);
            }
        }
    };
    walk(groupId);
    return ids;
}

function hasSiblingWithName(groups, name, parentId, excludeId = null) {
    const normalizedName = name.toLowerCase();
    const normalizedParent = normalizeParentId(parentId);
    return groups.some((group) =>
        !group.isDefault &&
        group.id !== excludeId &&
        getGroupParentId(group) === normalizedParent &&
        String(group.name || '').toLowerCase() === normalizedName
    );
}

// Create a new group
export function createGroup({ name, icon = 'pi-folder', color = '#4fc3f7', parentId = null }) {
    if (!name || !name.trim()) {
        throw new Error('El nombre del grupo es requerido');
    }

    const groups = loadGroups();
    const normalizedParent = normalizeParentId(parentId);
    const parentExists = normalizedParent
        ? groups.some((group) => !group.isDefault && group.id === normalizedParent)
        : true;
    const safeParentId = parentExists ? normalizedParent : null;

    if (hasSiblingWithName(groups, name.trim(), safeParentId)) {
        throw new Error('Ya existe un grupo con ese nombre');
    }

    const newGroup = {
        id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        icon,
        color,
        parentId: safeParentId,
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
        const nextParentId = Object.prototype.hasOwnProperty.call(updates, 'parentId')
            ? normalizeParentId(updates.parentId)
            : getGroupParentId(groups[idx]);
        if (hasSiblingWithName(groups, updates.name, nextParentId, groupId)) {
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

    const descendantIds = collectDescendantGroupIds(groups, groupId);
    const idsToDelete = [groupId, ...descendantIds];
    const idSet = new Set(idsToDelete);
    const filtered = groups.filter(g => !idSet.has(g.id));
    saveGroups(filtered);

    removeFavoriteGroupAssignmentsMany(idsToDelete);

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

export function setGroupParents(parentMap) {
    if (!parentMap) return loadGroups();
    const lookup = parentMap instanceof Map
        ? parentMap
        : new Map(Object.entries(parentMap));
    const groups = loadGroups();
    let changed = false;

    for (const group of groups) {
        if (group.isDefault || !lookup.has(group.id)) continue;
        const nextParent = normalizeParentId(lookup.get(group.id));
        if (getGroupParentId(group) !== nextParent) {
            group.parentId = nextParent;
            group.updatedAt = new Date().toISOString();
            changed = true;
        }
    }

    if (changed) {
        saveGroups(groups);
    }
    return groups;
}

// ============================================
// Favorite-Group Assignments
// ============================================

const ASSIGNMENTS_KEY = 'nodeterm_favorite_group_assignments';
const LEGACY_ASSIGNMENTS_KEY = 'nodeterm_group_assignments';
const MEMBER_ORDER_KEY = 'nodeterm_favorite_member_order';

function loadAssignments() {
    const saved = localStorage.getItem(ASSIGNMENTS_KEY);
    if (saved) {
        return safeParse(saved, {});
    }

    const legacy = localStorage.getItem(LEGACY_ASSIGNMENTS_KEY);
    if (legacy) {
        localStorage.setItem(ASSIGNMENTS_KEY, legacy);
        localStorage.removeItem(LEGACY_ASSIGNMENTS_KEY);
        return safeParse(legacy, {});
    }

    return {};
}

function saveAssignments(assignments) {
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
    window.dispatchEvent(new CustomEvent(UPDATED_EVENT, { detail: { assignments } }));
}

function loadMemberOrder() {
    return safeParse(localStorage.getItem(MEMBER_ORDER_KEY), { root: [], groups: {} });
}

function saveMemberOrder(order) {
    localStorage.setItem(MEMBER_ORDER_KEY, JSON.stringify(order));
    window.dispatchEvent(new CustomEvent(UPDATED_EVENT, { detail: { memberOrder: order } }));
}

export function getFavoriteMemberOrder() {
    const order = loadMemberOrder();
    return {
        root: Array.isArray(order.root) ? order.root : [],
        groups: order.groups && typeof order.groups === 'object' ? order.groups : {},
        rootKeys: Array.isArray(order.rootKeys) ? order.rootKeys : [],
        groupKeys: order.groupKeys && typeof order.groupKeys === 'object' ? order.groupKeys : {}
    };
}

export function setFavoriteMemberOrder(order) {
    saveMemberOrder({
        root: Array.isArray(order?.root) ? order.root : [],
        groups: order?.groups && typeof order.groups === 'object' ? order.groups : {},
        rootKeys: Array.isArray(order?.rootKeys) ? order.rootKeys : [],
        groupKeys: order?.groupKeys && typeof order.groupKeys === 'object' ? order.groupKeys : {}
    });
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

// Remove all group assignments for a deleted favorite
export function clearFavoriteAssignments(favoriteId) {
    if (!favoriteId) return;
    const assignments = loadAssignments();
    if (!assignments[favoriteId]) return;
    delete assignments[favoriteId];
    saveAssignments(assignments);
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

function removeFavoriteGroupAssignmentsMany(groupIds) {
    const idSet = new Set((groupIds || []).filter(Boolean));
    if (idSet.size === 0) return;
    const assignments = loadAssignments();
    let changed = false;

    for (const favoriteId in assignments) {
        const next = assignments[favoriteId].filter((id) => !idSet.has(id));
        if (next.length !== assignments[favoriteId].length) {
            changed = true;
            if (next.length === 0) {
                delete assignments[favoriteId];
            } else {
                assignments[favoriteId] = next;
            }
        }
    }

    if (changed) {
        saveAssignments(assignments);
    }
}

// Remove all assignments for a deleted group
function removeFavoriteGroupAssignments(groupId) {
    removeFavoriteGroupAssignmentsMany([groupId]);
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

// ============================================
// Unified Filter Configuration
// ============================================

// Load filter configuration (order and hidden filters)
function loadFilterConfig() {
    return safeParse(localStorage.getItem(FILTER_CONFIG_KEY), { order: [], hidden: [] });
}

// Save filter configuration
function saveFilterConfig(config) {
    localStorage.setItem(FILTER_CONFIG_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(UPDATED_EVENT, { detail: { filterConfig: config } }));
}

// Get filter configuration
export function getFilterConfig() {
    return loadFilterConfig();
}

// Get all protocol filters
export function getProtocolFilters() {
    return [...PROTOCOL_FILTERS];
}

// Get all filters (protocols + groups) in configured order, respecting visibility
export function getAllFilters() {
    const config = loadFilterConfig();
    const protocolFilters = [...PROTOCOL_FILTERS];
    const userGroups = loadGroups().filter(g => !g.isDefault).map(g => ({
        id: g.id,
        type: 'group',
        label: g.name,
        icon: g.icon || 'pi-folder',
        color: g.color,
        isProtocol: false,
        isGroup: true
    }));

    // Combine all filters
    let allFilters = [...protocolFilters, ...userGroups];

    // Apply custom order if exists
    if (config.order && config.order.length > 0) {
        const orderedFilters = [];
        const filterMap = new Map(allFilters.map(f => [f.id, f]));

        // Add filters in saved order
        for (const id of config.order) {
            if (filterMap.has(id)) {
                orderedFilters.push(filterMap.get(id));
                filterMap.delete(id);
            }
        }

        // Add any new filters that weren't in the saved order
        for (const [, filter] of filterMap) {
            orderedFilters.push(filter);
        }

        allFilters = orderedFilters;
    }

    // Apply visibility filter (but always show 'all')
    const hiddenSet = new Set(config.hidden || []);
    return allFilters.map(f => ({
        ...f,
        visible: f.id === 'all' || !hiddenSet.has(f.id)
    }));
}

// Get only visible filters
export function getVisibleFilters() {
    return getAllFilters().filter(f => f.visible);
}

// Set visibility for a filter
export function setFilterVisibility(filterId, visible) {
    if (filterId === 'all') return; // 'all' filter always visible

    const config = loadFilterConfig();
    const hidden = new Set(config.hidden || []);

    if (visible) {
        hidden.delete(filterId);
    } else {
        hidden.add(filterId);
    }

    config.hidden = [...hidden];
    saveFilterConfig(config);
}

// Reorder all filters
export function reorderAllFilters(newOrderIds) {
    const config = loadFilterConfig();
    config.order = newOrderIds;
    saveFilterConfig(config);
}

// Reset filter configuration to defaults
export function resetFilterConfig() {
    localStorage.removeItem(FILTER_CONFIG_KEY);
    window.dispatchEvent(new CustomEvent(UPDATED_EVENT, { detail: { filterConfig: null } }));
}

export default {
    getGroups,
    getUserGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    reorderGroups,
    getGroupById,
    setGroupParents,
    getFavoriteGroups,
    assignFavoriteToGroups,
    addFavoriteToGroup,
    removeFavoriteFromGroup,
    clearFavoriteAssignments,
    getFavoritesInGroup,
    isFavoriteInGroup,
    onGroupsUpdate,
    countFavoritesPerGroup,
    // New filter config exports
    getFilterConfig,
    getProtocolFilters,
    getAllFilters,
    getVisibleFilters,
    setFilterVisibility,
    reorderAllFilters,
    resetFilterConfig,
    getFavoriteMemberOrder,
    setFavoriteMemberOrder,
    PROTOCOL_FILTERS
};
