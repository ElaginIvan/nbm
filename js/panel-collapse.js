addEventListener// js/panel-collapse.js

export const PanelManager = {
    isModelEnabled: true, // true = включено, false = выключено
    currentViewMode: '3D', // '3D' или '2D' - текущий режим просмотра

    init() {
        this.toggleBtn = document.getElementById('toggle-model-btn');
        this.modelContainer = document.getElementById('model-container');
        this.drawingContainer = document.getElementById('drawing-container');

        if (!this.toggleBtn || !this.modelContainer || !this.drawingContainer) {
            console.warn('Panel toggle elements not found');
            return;
        }

        // Получаем текущий режим из DrawingViewer если он доступен
        if (window.DrawingViewer) {
            this.currentViewMode = window.DrawingViewer.getCurrentMode();
        }

        // Устанавливаем начальное состояние
        this.updateToggleButton();

        // Обработчик клика на кнопку
        this.toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleCurrentView();
        });

        // Слушаем изменение режима просмотра
        this.listenToViewModeChanges();

        console.log('Panel manager initialized');
    },

    listenToViewModeChanges() {
        // Следим за изменениями режима просмотра
        document.addEventListener('viewModeChanged', (e) => {
            if (e.detail && e.detail.mode) {
                this.currentViewMode = e.detail.mode;
                this.updateToggleButton();
            }
        });

        // Также отслеживаем изменения в DrawingViewer
        const originalToggleMode = window.DrawingViewer?.toggleMode;
        if (window.DrawingViewer && originalToggleMode) {
            window.DrawingViewer.toggleMode = function () {
                originalToggleMode.call(this);
                this.currentViewMode = this.getCurrentMode();

                // Отправляем событие
                document.dispatchEvent(new CustomEvent('viewModeChanged', {
                    detail: { mode: this.currentViewMode }
                }));
            }.bind(window.DrawingViewer);
        }
    },

    toggleCurrentView() {
        if (this.currentViewMode === '3D') {
            this.toggleModel();
        } else {
            this.toggleDrawing();
        }
    },

    toggleModel() {
        if (this.isModelEnabled) {
            this.disableModel();
        } else {
            this.enableModel();
        }
    },

    toggleDrawing() {
        if (this.isDrawingEnabled()) {
            this.disableDrawing();
        } else {
            this.enableDrawing();
        }
    },

    isDrawingEnabled() {
        return !this.drawingContainer.classList.contains('disabled');
    },

    enableModel() {
        this.modelContainer.classList.remove('disabled');
        this.toggleBtn.classList.add('enabled');
        this.toggleBtn.innerHTML = `
            <i class="fas fa-eye"></i>
            <span>Скрыть 3D</span>
        `;

        this.isModelEnabled = true;
        console.log('3D Model enabled');
    },

    disableModel() {
        this.modelContainer.classList.add('disabled');
        this.toggleBtn.classList.remove('enabled');
        this.toggleBtn.innerHTML = `
            <i class="fas fa-eye-slash"></i>
            <span>Показать 3D</span>
        `;

        this.isModelEnabled = false;
        console.log('3D Model disabled');
    },

    enableDrawing() {
        this.drawingContainer.classList.remove('disabled');
        this.toggleBtn.classList.add('enabled');
        this.toggleBtn.innerHTML = `
            <i class="fas fa-eye"></i>
            <span>Скрыть 2D</span>
        `;

        console.log('2D Drawing enabled');
    },

    disableDrawing() {
        this.drawingContainer.classList.add('disabled');
        this.toggleBtn.classList.remove('enabled');
        this.toggleBtn.innerHTML = `
            <i class="fas fa-eye-slash"></i>
            <span>Показать 2D</span>
        `;

        console.log('2D Drawing disabled');
    },

    updateToggleButton() {
        if (this.currentViewMode === '3D') {
            if (this.isModelEnabled) {
                this.toggleBtn.classList.add('enabled');
                this.toggleBtn.innerHTML = `
                    <i class="fas fa-eye"></i>
                    <span>Скрыть 3D</span>
                `;
            } else {
                this.toggleBtn.classList.remove('enabled');
                this.toggleBtn.innerHTML = `
                    <i class="fas fa-eye-slash"></i>
                    <span>Показать 3D</span>
                `;
            }
        } else {
            if (this.isDrawingEnabled()) {
                this.toggleBtn.classList.add('enabled');
                this.toggleBtn.innerHTML = `
                    <i class="fas fa-eye"></i>
                    <span>Скрыть 2D</span>
                `;
            } else {
                this.toggleBtn.classList.remove('enabled');
                this.toggleBtn.innerHTML = `
                    <i class="fas fa-eye-slash"></i>
                    <span>Показать 2D</span>
                `;
            }
        }
    },

    // Метод для принудительного изменения состояния
    setModelEnabled(state) {
        if (state) {
            this.enableModel();
        } else {
            this.disableModel();
        }
    },

    // Метод для принудительного изменения состояния 2D
    setDrawingEnabled(state) {
        if (state) {
            this.enableDrawing();
        } else {
            this.disableDrawing();
        }
    },

    // Обновляем состояние на основе текущего режима
    syncWithViewMode() {
        if (window.DrawingViewer) {
            this.currentViewMode = window.DrawingViewer.getCurrentMode();
            this.updateToggleButton();
        }
    }
};

// Автоматическая инициализация
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PanelManager.init());
} else {
    PanelManager.init();
}

// Экспортируем для использования в других модулях
window.PanelManager = PanelManager;