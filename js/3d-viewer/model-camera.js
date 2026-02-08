/**
 * Настраивает камеру, рендерер и элементы управления
 * @param {HTMLElement} container - Контейнер для 3D-просмотра
 * @param {HTMLCanvasElement} canvas - Canvas элемент
 * @returns {Object} Объект с камерой, рендерером и контролами
 */
export function setupCamera(container, canvas) {
    // Создаем камеру
    const camera = new THREE.PerspectiveCamera(26, container.clientWidth / container.clientHeight, 0.1, 2000);
    camera.position.set(5, 5, 5);

    // Создаем рендерер
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0); // Прозрачный фон

    // Добавляем управление
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    return { camera, renderer, controls };
}