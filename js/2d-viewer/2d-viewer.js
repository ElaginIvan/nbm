/**
 * Модуль для работы с 2D чертежами
 */
export const DrawingViewer = {
    currentMode: '3D', // '3D' или '2D'
    currentProjectId: null,
    currentImage: null,
    zoomLevel: 1,
    isDragging: false,
    isZooming: false,
    dragStart: { x: 0, y: 0 },
    imagePos: { x: 0, y: 0 },
    initialDistance: null,
    initialZoom: 1,
    boundHandleTouchStart: null,
    boundHandleTouchMove: null,
    boundHandleTouchEnd: null,
    zoomSensitivity: 0.001,
    maxZoom: 5,
    minZoom: 0.1,

    /**
     * Инициализация 2D просмотрщика
     */
    init() {
        // Не загружаем projectId сразу, ждем загрузки данных
        this.bindEvents();
        this.updateButtonState();
        console.log('2D Viewer initialized');
        
        // Откладываем получение projectId
        setTimeout(() => {
            this.currentProjectId = this.getProjectId();
            console.log('2D Viewer got project ID:', this.currentProjectId);
        }, 100);
    },

    /**
     * Получает ID текущего проекта
     */
    getProjectId() {
        const projectData = document.getElementById('project-data');
        if (projectData) {
            return projectData.getAttribute('data-project-id');
        }
        return null;
    },

    /**
     * Перезагружает ID проекта (если изменился)
     */
    refreshProjectId() {
        const newId = this.getProjectId();
        if (newId !== this.currentProjectId) {
            console.log('Project ID changed:', this.currentProjectId, '->', newId);
            this.currentProjectId = newId;
        }
        return this.currentProjectId;
    },

    /**
     * Привязывает события
     */
    bindEvents() {
        // Кнопка переключения 3D/2D
        const toggleBtn = document.getElementById('toggle-3d-2d-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMode();
            });
        }

        // Кнопки управления масштабом
        document.querySelector('.zoom-in')?.addEventListener('click', () => this.zoomIn());
        document.querySelector('.zoom-out')?.addEventListener('click', () => this.zoomOut());
        document.querySelector('.zoom-reset')?.addEventListener('click', () => this.resetZoom());

        // События для перетаскивания изображения (ТОЛЬКО мышью)
        const imageElement = document.getElementById('drawing-image');
        if (imageElement) {
            imageElement.addEventListener('mousedown', this.startDrag.bind(this));
            // touchstart теперь обрабатывается в drawingWrapper
        }

        // Глобальные события для прекращения перетаскивания
        document.addEventListener('mouseup', this.stopDrag.bind(this));
        document.addEventListener('mousemove', this.doDrag.bind(this));

        // Обработка колеса мыши для масштабирования
        const drawingContainer = document.getElementById('drawing-container');
        if (drawingContainer) {
            drawingContainer.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        }

        // Обработка кликов по строкам таблицы
        document.addEventListener('click', (e) => {
            const partRow = e.target.closest('.part-row');
            if (partRow) {
                const partName = partRow.getAttribute('data-part-name');
                if (partName && this.currentMode === '2D') {
                    console.log('📋 Table row clicked in 2D mode:', partName);
                    this.loadDrawing(partName);
                }
            }
        });

        // Обработка жестов для тач-устройств (pinch-to-zoom)
        const drawingWrapper = document.querySelector('.drawing-wrapper');
        if (drawingWrapper) {
            // Сохраняем привязанные методы, чтобы потом удалить их
            this.boundHandleTouchStart = this.handleTouchStart.bind(this);
            this.boundHandleTouchMove = this.handleTouchMove.bind(this);
            this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);

            // Удаляем старые обработчики если они есть
            if (this.boundHandleTouchStart) {
                drawingWrapper.removeEventListener('touchstart', this.boundHandleTouchStart);
                drawingWrapper.removeEventListener('touchmove', this.boundHandleTouchMove);
                drawingWrapper.removeEventListener('touchend', this.boundHandleTouchEnd);
            }

            // Добавляем новые обработчики
            drawingWrapper.addEventListener('touchstart', this.boundHandleTouchStart, { passive: true });
            drawingWrapper.addEventListener('touchmove', this.boundHandleTouchMove, { passive: true });
            drawingWrapper.addEventListener('touchend', this.boundHandleTouchEnd);
        }
    },

    /**
     * Обработка колеса мыши для масштабирования
     */
    handleWheel(e) {
        if (this.currentMode !== '2D') return;

        e.preventDefault();
        e.stopPropagation();

        const drawingContainer = document.getElementById('drawing-container');
        const imageElement = document.getElementById('drawing-image');

        if (!drawingContainer || !imageElement) return;

        // Определяем направление масштабирования
        const delta = Math.sign(e.deltaY);
        const zoomFactor = delta > 0 ? 0.9 : 1.1; // 10% за шаг

        // Вычисляем старые координаты курсора относительно изображения
        const rect = drawingContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Координаты курсора относительно центра изображения (без учета transform)
        const imageRect = imageElement.getBoundingClientRect();
        const imageCenterX = imageRect.left - rect.left + imageRect.width / 2;
        const imageCenterY = imageRect.top - rect.top + imageRect.height / 2;

        // Вычисляем текущее положение курсора относительно центра изображения
        const relativeX = mouseX - imageCenterX;
        const relativeY = mouseY - imageCenterY;

        // Сохраняем старый масштаб
        const oldZoom = this.zoomLevel;

        // Применяем новый масштаб
        this.zoomLevel *= zoomFactor;
        this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel));

        // Если масштаб изменился, корректируем позицию
        if (this.zoomLevel !== oldZoom) {
            // Вычисляем коэффициент изменения масштаба
            const scaleChange = this.zoomLevel / oldZoom;

            // Корректируем позицию так, чтобы точка под курсором осталась на месте
            // Новая позиция = старая позиция + смещение курсора * (1 - изменение_масштаба)
            this.imagePos.x -= relativeX * (1 - 1 / scaleChange);
            this.imagePos.y -= relativeY * (1 - 1 / scaleChange);

            this.applyZoom();
        }
    },

    /**
     * Обработка начала касания для жестов
     */
    handleTouchStart(e) {
        // Если это жест с двумя пальцами, начинаем зум
        if (e.touches.length === 2) {
            e.preventDefault();
            e.stopPropagation();

            this.isZooming = true;
            this.isDragging = false;

            // Вычисляем начальное расстояние между пальцами
            this.initialDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
            this.initialZoom = this.zoomLevel;

            // Также сохраняем начальные координаты для позиции
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            this.dragStart.x = (touch1.clientX + touch2.clientX) / 2 - this.imagePos.x;
            this.dragStart.y = (touch1.clientY + touch2.clientY) / 2 - this.imagePos.y;

        }
        // Если это одно касание, начинаем перетаскивание
        else if (e.touches.length === 1) {
            e.preventDefault();
            e.stopPropagation();

            this.isDragging = true;
            const touch = e.touches[0];
            this.dragStart.x = touch.clientX - this.imagePos.x;
            this.dragStart.y = touch.clientY - this.imagePos.y;

            const imageElement = document.getElementById('drawing-image');
            if (imageElement) {
                imageElement.classList.add('dragging');
            }
        }
    },

    /**
     * Обработка движения пальцев для жестов
     */
    handleTouchMove(e) {
        if (this.isZooming && e.touches.length === 2) {
            // Обработка жеста pinch-to-zoom
            e.preventDefault();
            e.stopPropagation();

            // Вычисляем текущее расстояние между пальцами
            const currentDistance = this.getTouchDistance(e.touches[0], e.touches[1]);

            if (this.initialDistance) {
                // Вычисляем коэффициент масштабирования
                const scaleFactor = currentDistance / this.initialDistance;

                // Применяем масштабирование с центром между пальцами
                const newZoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, this.initialZoom * scaleFactor));

                // Если масштаб изменился, корректируем позицию для центрирования
                if (newZoomLevel !== this.zoomLevel) {
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];

                    // Центр между двумя пальцами
                    const centerX = (touch1.clientX + touch2.clientX) / 2;
                    const centerY = (touch1.clientY + touch2.clientY) / 2;

                    // Получаем контейнер для вычисления относительных координат
                    const drawingContainer = document.getElementById('drawing-container');
                    const imageElement = document.getElementById('drawing-image');

                    if (drawingContainer && imageElement) {
                        const rect = drawingContainer.getBoundingClientRect();
                        const imageRect = imageElement.getBoundingClientRect();

                        // Координаты центра пальцев относительно контейнера
                        const containerCenterX = centerX - rect.left;
                        const containerCenterY = centerY - rect.top;

                        // Координаты центра изображения относительно контейнера
                        const imageCenterX = imageRect.left - rect.left + imageRect.width / 2;
                        const imageCenterY = imageRect.top - rect.top + imageRect.height / 2;

                        // Вычисляем смещение
                        const relativeX = containerCenterX - imageCenterX;
                        const relativeY = containerCenterY - imageCenterY;

                        // Сохраняем старый масштаб
                        const oldZoom = this.zoomLevel;
                        this.zoomLevel = newZoomLevel;

                        // Корректируем позицию для центрирования на жесте
                        const scaleChange = this.zoomLevel / oldZoom;
                        this.imagePos.x -= relativeX * (1 - 1 / scaleChange);
                        this.imagePos.y -= relativeY * (1 - 1 / scaleChange);
                    }

                    this.applyZoom();
                }
            }
        } else if (this.isDragging && e.touches.length === 1) {
            // Обычное перетаскивание одним пальцем
            e.preventDefault();
            const touch = e.touches[0];
            this.imagePos.x = touch.clientX - this.dragStart.x;
            this.imagePos.y = touch.clientY - this.dragStart.y;
            this.applyZoom();
        }
    },

    /**
     * Завершает движения пальцев для жестов
     */
    handleTouchEnd(e) {

        if (this.isZooming) {
            this.isZooming = false;
            this.initialDistance = null;
            this.initialZoom = 1;
        }

        // Сбрасываем состояние перетаскивания
        if (e.touches.length === 0) {
            this.stopDrag(); // ← Этот вызов уже есть, оставить
        }
    },

    /**
     * Вычисляет расстояние между двумя точками касания
     */
    getTouchDistance(touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Показывает сообщение, если чертеж не найден
     */
    showNoDrawingFound(designation) {
        const placeholder = document.getElementById('drawing-placeholder');
        placeholder.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <p>Чертеж "${designation}" не найден</p>
    `;
        placeholder.style.display = 'block';

        const imageElement = document.getElementById('drawing-image');
        imageElement.style.display = 'none';
    },

    /**
     * Прекращает перетаскивание
     */
    stopDrag() {
        this.isDragging = false;
        const imageElement = document.getElementById('drawing-image');
        if (imageElement) {
            imageElement.classList.remove('dragging');
        }
    },

    /**
     * Переключает режим просмотра
     */
    toggleMode() {
        const oldMode = this.currentMode;
        this.currentMode = this.currentMode === '3D' ? '2D' : '3D';
        this.updateView();
        this.updateButtonState();

        // Уведомляем PanelManager о смене режима
        if (window.PanelManager) {
            window.PanelManager.currentViewMode = this.currentMode;
            window.PanelManager.updateToggleButton();
        }

        // Отправляем кастомное событие
        document.dispatchEvent(new CustomEvent('viewModeChanged', {
            detail: { mode: this.currentMode, oldMode: oldMode }
        }));

        // Если переключились в 2D режим и есть активная строка таблицы, загружаем чертеж
        if (this.currentMode === '2D') {
            const activeRow = document.querySelector('.part-row.active');
            if (activeRow) {
                const partName = activeRow.getAttribute('data-part-name');
                this.loadDrawing(partName);
            }
        }

        // Обновляем Three.js если нужно (только при переходе в 3D режим)
        if (this.currentMode === '3D' && window.onWindowResize) {
            setTimeout(() => window.onWindowResize(), 50);
        }
    },

    /**
     * Обновляет отображение в зависимости от режима
     */
    updateView() {
        const modelContainer = document.getElementById('model-container');
        const drawingContainer = document.getElementById('drawing-container');

        if (this.currentMode === '3D') {
            modelContainer.classList.add('active');
            modelContainer.classList.remove('disabled');
            drawingContainer.classList.remove('active');
        } else {
            modelContainer.classList.remove('active');
            drawingContainer.classList.add('active');

            // Показываем плейсхолдер если нет изображения
            const imageElement = document.getElementById('drawing-image');
            const placeholder = document.getElementById('drawing-placeholder');

            if (this.currentImage) {
                imageElement.style.display = 'block';
                placeholder.style.display = 'none';
            } else {
                imageElement.style.display = 'none';
                placeholder.style.display = 'block';
            }
        }
    },

    /**
     * Обновляет состояние кнопки
     */
    updateButtonState() {
        const toggleBtn = document.getElementById('toggle-3d-2d-btn');
        if (!toggleBtn) return;

        toggleBtn.classList.remove('mode-3d', 'mode-2d');
        toggleBtn.classList.add(`mode-${this.currentMode.toLowerCase()}`);

        // Обновляем иконку
        const icon = toggleBtn.querySelector('i');
        if (this.currentMode === '3D') {
            icon.className = 'fas fa-image';
        } else {
            icon.className = 'fas fa-cube';
        }
    },

    /**
     * Загружает чертежи для детали с поддержкой нескольких листов
     * @param {string} designation - Обозначение детали из таблицы
     */
    async loadDrawing(designation) {
        // Обновляем ID проекта
        this.refreshProjectId();

        // Если projectId все еще null, ждем немного
        if (!this.currentProjectId) {
            console.warn('Waiting for project ID...');
            await new Promise(resolve => setTimeout(resolve, 500));
            this.refreshProjectId();
        }

        if (!designation || !this.currentProjectId) {
            console.warn('Cannot load drawing: no designation or project ID');
            this.showNoDrawingFound(designation);
            return;
        }

        // Очищаем обозначение
        const cleanDesignation = designation.replace(/:\d+$/, '').trim();
        console.log('🔍 Поиск чертежей для:', cleanDesignation);

        // Ищем все чертежи по схеме "КТ-01.000 Лист-1.png", "КТ-01.000 Лист-2.png" и т.д.
        const drawings = await this.findDrawingsByPattern(cleanDesignation);

        if (drawings.length === 0) {
            this.showNoDrawingFound(cleanDesignation);
            return;
        }

        console.log(`✅ Найдено чертежей: ${drawings.length}`, drawings);

        // Отображаем чертежи
        if (drawings.length === 1) {
            this.loadSingleDrawing(drawings[0]);
        } else {
            this.loadMultipleDrawings(drawings, cleanDesignation);
        }
    },

    /**
     * Ищет чертежи по паттерну
     * @param {string} designation - Обозначение детали
     * @returns {Array} Массив найденных чертежей
     */
    async findDrawingsByPattern(designation) {
        if (!this.currentProjectId) return [];

        const drawings = [];
        let sheetNumber = 1;
        const maxSheets = 10; // Максимальное количество листов для поиска

        // Сначала проверяем основной чертеж без указания листа
        const basePath = `models/${this.currentProjectId}/png/${designation}.png`;
        try {
            const response = await fetch(basePath, { method: 'HEAD' });
            if (response.ok) {
                drawings.push({
                    path: basePath,
                    name: `${designation}.png`,
                    sheetNumber: 1,
                    isBase: true
                });
            }
        } catch (error) {
            // Базовый чертеж не найден - это нормально
        }

        // Затем проверяем листы по порядку: Лист-1, Лист-2, Лист-3...
        while (sheetNumber <= maxSheets) {
            const pathWithSheet = `models/${this.currentProjectId}/png/${designation} Лист-${sheetNumber}.png`;

            try {
                const response = await fetch(pathWithSheet, { method: 'HEAD' });
                if (response.ok) {
                    drawings.push({
                        path: pathWithSheet,
                        name: `${designation} Лист-${sheetNumber}.png`,
                        sheetNumber: sheetNumber,
                        isBase: false
                    });
                    sheetNumber++;
                } else {
                    // Если лист не найден, прерываем поиск
                    break;
                }
            } catch (error) {
                // Если ошибка при проверке, прекращаем поиск
                break;
            }
        }

        // Если нет основного чертежа и нет листов, пробуем альтернативные форматы
        if (drawings.length === 0) {
            // Попробуем без пробела: "КТ-01.000Лист-1.png"
            sheetNumber = 1;
            while (sheetNumber <= maxSheets) {
                const pathNoSpace = `models/${this.currentProjectId}/png/${designation}Лист-${sheetNumber}.png`;

                try {
                    const response = await fetch(pathNoSpace, { method: 'HEAD' });
                    if (response.ok) {
                        drawings.push({
                            path: pathNoSpace,
                            name: `${designation}Лист-${sheetNumber}.png`,
                            sheetNumber: sheetNumber,
                            isBase: false
                        });
                        sheetNumber++;
                    } else {
                        break;
                    }
                } catch (error) {
                    break;
                }
            }
        }

        // Сортируем чертежи по номеру листа
        return drawings.sort((a, b) => {
            // Сначала основной чертеж (без листа)
            if (a.isBase && !b.isBase) return -1;
            if (!a.isBase && b.isBase) return 1;

            // Затем по номеру листа
            return a.sheetNumber - b.sheetNumber;
        });
    },

    /**
     * Загружает один чертеж
     * @param {Object} drawing - Объект чертежа
     */
    loadSingleDrawing(drawing) {
        const imageElement = document.getElementById('drawing-image');
        const placeholder = document.getElementById('drawing-placeholder');

        placeholder.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        <p>Загрузка чертежа...</p>
    `;
        placeholder.style.display = 'block';
        imageElement.style.display = 'none';

        this.currentImage = new Image();
        this.currentImage.onload = () => {
            imageElement.src = this.currentImage.src;
            imageElement.style.display = 'block';
            placeholder.style.display = 'none';
            this.resetZoom();
            console.log('✅ Чертеж загружен:', drawing.name);
        };

        this.currentImage.onerror = () => {
            placeholder.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>Ошибка загрузки чертежа: ${drawing.name}</p>
        `;
        };

        this.currentImage.src = drawing.path;

        // Убираем элементы управления для нескольких чертежей
        this.removeMultiDrawingControls();
    },

    /**
     * Загружает несколько чертежей
     * @param {Array} drawings - Массив чертежей
     * @param {string} designation - Обозначение детали
     */
    loadMultipleDrawings(drawings, designation) {
        const imageElement = document.getElementById('drawing-image');
        const placeholder = document.getElementById('drawing-placeholder');

        // Сохраняем данные о чертежах
        window.currentDrawings = {
            files: drawings,
            currentIndex: 0,
            designation: designation
        };

        // Создаем элементы управления
        this.createMultiDrawingControls();

        // Загружаем первый чертеж
        this.loadDrawingFromList(0);
    },

    /**
     * Создает элементы управления для нескольких чертежей
     */
    createMultiDrawingControls() {
        const controls = document.querySelector('.drawing-controls');

        // Удаляем старые элементы управления если есть
        this.removeMultiDrawingControls();

        // Добавляем кнопки навигации
        const prevBtn = document.createElement('button');
        prevBtn.className = 'drawing-btn prev-drawing';
        prevBtn.title = 'Предыдущий лист';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.style.display = 'flex';
        controls.insertBefore(prevBtn, controls.firstChild);

        const nextBtn = document.createElement('button');
        nextBtn.className = 'drawing-btn next-drawing';
        nextBtn.title = 'Следующий лист';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.style.display = 'flex';
        controls.appendChild(nextBtn);

        // Добавляем индикатор
        const indicator = document.createElement('div');
        indicator.className = 'drawing-indicator';
        indicator.innerHTML = '<span class="current-sheet">1</span> / <span class="total-sheets">1</span>';
        indicator.style.cssText = `
        color: var(--text-color);
        font-size: 0.875rem;
        margin: 0 4px;
        background: var(--card-background);
        border-radius: var(--radius-sm);
        border: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
    `;
        controls.appendChild(indicator);

        // Обработчики кнопок
        prevBtn.addEventListener('click', () => this.switchDrawing(-1));
        nextBtn.addEventListener('click', () => this.switchDrawing(1));

        // Обновляем индикатор
        this.updateDrawingIndicator();
    },

    /**
     * Удаляет элементы управления для нескольких чертежей
     */
    removeMultiDrawingControls() {
        const controls = document.querySelector('.drawing-controls');
        const prevBtn = controls.querySelector('.prev-drawing');
        const nextBtn = controls.querySelector('.next-drawing');
        const indicator = controls.querySelector('.drawing-indicator');

        if (prevBtn) prevBtn.remove();
        if (nextBtn) nextBtn.remove();
        if (indicator) indicator.remove();
    },

    /**
     * Загружает чертеж из списка по индексу
     * @param {number} index - Индекс чертежа
     */
    loadDrawingFromList(index) {
        if (!window.currentDrawings || !window.currentDrawings.files[index]) {
            return;
        }

        const drawing = window.currentDrawings.files[index];
        const imageElement = document.getElementById('drawing-image');
        const placeholder = document.getElementById('drawing-placeholder');

        // Показываем загрузку
        placeholder.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        <p>Загрузка листа ${index + 1} из ${window.currentDrawings.files.length}...</p>
    `;
        placeholder.style.display = 'block';
        imageElement.style.display = 'none';

        window.currentDrawings.currentIndex = index;

        const img = new Image();
        img.onload = () => {
            imageElement.src = img.src;
            imageElement.style.display = 'block';
            placeholder.style.display = 'none';
            this.resetZoom();
            this.updateDrawingIndicator();
            console.log(`✅ Лист ${index + 1} загружен:`, drawing.name);
        };
        img.onerror = () => {
            placeholder.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>Ошибка загрузки листа ${index + 1}</p>
        `;
            console.error(`❌ Ошибка загрузки:`, drawing.path);
        };
        img.src = drawing.path;
    },

    /**
     * Переключает между чертежами
     * @param {number} direction - Направление (-1 для предыдущего, 1 для следующего)
     */
    switchDrawing(direction) {
        if (!window.currentDrawings) return;

        const { files, currentIndex } = window.currentDrawings;
        const newIndex = (currentIndex + direction + files.length) % files.length;

        this.loadDrawingFromList(newIndex);
    },

    /**
     * Обновляет индикатор текущего чертежа
     */
    updateDrawingIndicator() {
        if (!window.currentDrawings) return;

        const { files, currentIndex } = window.currentDrawings;
        const currentEl = document.querySelector('.current-sheet');
        const totalEl = document.querySelector('.total-sheets');
        const prevBtn = document.querySelector('.prev-drawing');
        const nextBtn = document.querySelector('.next-drawing');

        if (currentEl) currentEl.textContent = currentIndex + 1;
        if (totalEl) totalEl.textContent = files.length;

        // Показываем/скрываем кнопки если это нужно
        if (files.length <= 1) {
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
        } else {
            if (prevBtn) prevBtn.style.display = 'flex';
            if (nextBtn) nextBtn.style.display = 'flex';
        }
    },

    /**
     * Увеличивает масштаб
     */
    zoomIn() {
        const drawingContainer = document.getElementById('drawing-container');
        const imageElement = document.getElementById('drawing-image');

        if (drawingContainer && imageElement) {
            // Получаем центр контейнера для центрирования
            const rect = drawingContainer.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // Координаты центра изображения
            const imageRect = imageElement.getBoundingClientRect();
            const imageCenterX = imageRect.left - rect.left + imageRect.width / 2;
            const imageCenterY = imageRect.top - rect.top + imageRect.height / 2;

            // Вычисляем смещение
            const relativeX = centerX - imageCenterX;
            const relativeY = centerY - imageCenterY;

            // Сохраняем старый масштаб
            const oldZoom = this.zoomLevel;
            this.zoomLevel = Math.min(this.zoomLevel + 0.25, this.maxZoom);

            // Корректируем позицию для центрирования
            const scaleChange = this.zoomLevel / oldZoom;
            this.imagePos.x -= relativeX * (1 - 1 / scaleChange);
            this.imagePos.y -= relativeY * (1 - 1 / scaleChange);
        } else {
            this.zoomLevel = Math.min(this.zoomLevel + 0.25, this.maxZoom);
        }

        this.applyZoom();
    },

    /**
     * Уменьшает масштаб
     */
    zoomOut() {
        const drawingContainer = document.getElementById('drawing-container');
        const imageElement = document.getElementById('drawing-image');

        if (drawingContainer && imageElement) {
            // Получаем центр контейнера для центрирования
            const rect = drawingContainer.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // Координаты центра изображения
            const imageRect = imageElement.getBoundingClientRect();
            const imageCenterX = imageRect.left - rect.left + imageRect.width / 2;
            const imageCenterY = imageRect.top - rect.top + imageRect.height / 2;

            // Вычисляем смещение
            const relativeX = centerX - imageCenterX;
            const relativeY = centerY - imageCenterY;

            // Сохраняем старый масштаб
            const oldZoom = this.zoomLevel;
            this.zoomLevel = Math.max(this.zoomLevel - 0.25, this.minZoom);

            // Корректируем позицию для центрирования
            const scaleChange = this.zoomLevel / oldZoom;
            this.imagePos.x -= relativeX * (1 - 1 / scaleChange);
            this.imagePos.y -= relativeY * (1 - 1 / scaleChange);
        } else {
            this.zoomLevel = Math.max(this.zoomLevel - 0.25, this.minZoom);
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

        imageElement.style.transform = `translate(${this.imagePos.x}px, ${this.imagePos.y}px) scale(${this.zoomLevel})`;

        // Устанавливаем transform-origin в центр для более предсказуемого масштабирования
        imageElement.style.transformOrigin = 'center center';
    },

    /**
     * Начинает перетаскивание (мышь)
     */
    startDrag(e) {
        e.preventDefault();
        this.isDragging = true;
        this.dragStart.x = e.clientX - this.imagePos.x;
        this.dragStart.y = e.clientY - this.imagePos.y;

        const imageElement = document.getElementById('drawing-image');
        imageElement.classList.add('dragging');
    },

    /**
     * Выполняет перетаскивание (мышь)
     */
    doDrag(e) {
        if (!this.isDragging) return;

        e.preventDefault();
        this.imagePos.x = e.clientX - this.dragStart.x;
        this.imagePos.y = e.clientY - this.dragStart.y;
        this.applyZoom();
    },

    /**
     * Прекращает перетаскивание
     */
    stopDrag() {
        this.isDragging = false;
        const imageElement = document.getElementById('drawing-image');
        if (imageElement) {
            imageElement.classList.remove('dragging');
        }
    },

    /**
     * Устанавливает текущий режим (для использования извне)
     * @param {string} mode - '3D' или '2D'
     */
    setMode(mode) {
        if (mode !== '3D' && mode !== '2D') {
            console.error('Invalid mode:', mode);
            return;
        }

        const oldMode = this.currentMode;
        this.currentMode = mode;
        this.updateView();
        this.updateButtonState();

        // Уведомляем PanelManager о смене режима
        if (window.PanelManager) {
            window.PanelManager.currentViewMode = this.currentMode;
            window.PanelManager.updateToggleButton();
        }

        // Отправляем кастомное событие
        document.dispatchEvent(new CustomEvent('viewModeChanged', {
            detail: { mode: this.currentMode, oldMode: oldMode }
        }));
    },

    /**
     * Получает текущий режим
     * @returns {string} Текущий режим
     */
    getCurrentMode() {
        return this.currentMode;
    }
};

// Автоматическая инициализация
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DrawingViewer.init());
} else {
    DrawingViewer.init();
}

// Экспортируем для использования в других модулях
window.DrawingViewer = DrawingViewer;