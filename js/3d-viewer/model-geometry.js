/**
 * Добавляет ребра к объекту
 * @param {THREE.Object3D} object - Объект для добавления ребер
 * @param {number} edgeColor - Цвет ребер (по умолчанию 0xcccccc)
 */
export function addEdgesToObject(object, edgeColor = 0x808080) {
    object.traverse((child) => {
        if (child.isMesh) {
            const edgesGeometry = new THREE.EdgesGeometry(child.geometry, 35);
            const edgesMaterial = new THREE.LineBasicMaterial({
                color: edgeColor,
            });
            const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
            child.add(edges);

            // Добавляем уникальный идентификатор для каждой детали
            child.userData.isHighlightable = true;
        }
    });
}