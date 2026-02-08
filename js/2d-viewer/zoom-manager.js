/**
 * Модуль управления масштабированием
 */
export const ZoomManager = {
    zoomLevel: 1,
    minZoom: 0.1,
    maxZoom: 5,
    imagePos: { x: 0, y: 0 },
    currentMode: '3D', // Добавляем это свойство

    /**
     * Увеличивает масштаб
     */
    zoomIn() {
        this.performZoom(0.25, true);
    },

    /**
     * Уменьшает масштаб
     */
    zoomOut() {
        this.performZoom(-0.25, true);
    },

    /**
     * Выполняет масштабирование с центрированием
     */
    performZoom(zoomDelta, shouldCenter = false) {
        const drawingContainer = document.getElementById('drawing-container');
        const imageElement = document.getElementById('drawing-image');

        if (shouldCenter && drawingContainer && imageElement) {
            const rect = drawingContainer.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const imageRect = imageElement.getBoundingClientRect();
            const imageCenterX = imageRect.left - rect.left + imageRect.width / 2;
            const imageCenterY = imageRect.top - rect.top + imageRect.height / 2;

            const relativeX = centerX - imageCenterX;
            const relativeY = centerY - imageCenterY;

            const oldZoom = this.zoomLevel;
            this.zoomLevel = Math.max(this.minZoom, 
                Math.min(this.maxZoom, this.zoomLevel + zoomDelta));

            const scaleChange = this.zoomLevel / oldZoom;
            this.imagePos.x -= relativeX * (1 - 1 / scaleChange);
            this.imagePos.y -= relativeY * (1 - 1 / scaleChange);
        } else {
            this.zoomLevel = Math.max(this.minZoom, 
                Math.min(this.maxZoom, this.zoomLevel + zoomDelta));
        }

        this.applyZoom();
    },

    /**
     * Сбрасывает масштаб и позицию
     */
    resetZoom() {
        this.zoomLevel = 1;
        this.imagePos = { x: 0, y: 0 };
        this.applyZoom();
    },

    /**
     * Применяет текущий масштаб и позицию
     */
    applyZoom() {
        const imageElement = document.getElementById('drawing-image');
        if (!imageElement) return;

        imageElement.style.transform = 
            `translate(${this.imagePos.x}px, ${this.imagePos.y}px) scale(${this.zoomLevel})`;
        imageElement.style.transformOrigin = 'center center';
    },

    /**
     * Устанавливает позицию изображения
     */
    setImagePos(x, y) {
        this.imagePos.x = x;
        this.imagePos.y = y;
    },

    /**
     * Получает текущий масштаб
     */
    getZoomLevel() {
        return this.zoomLevel;
    }
};