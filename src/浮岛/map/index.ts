import { MapElement, MapFacility, MapLocation, MapWall, renderMacroMap, renderMicroMap } from './renderer';
import { showMapPopup } from './utils';

const ICONS = {
  location: `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
  map: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.5 3l-6 1.5-6-1.5-5.5 1.5v15l6-1.5 6 1.5 5.5-1.5v-15zm-11 13.5l-4 1v-12l4-1v12zm6-1l-4 1v-12l4-1v12z"/></svg>`,
  star: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`,
  tool: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>`,
};

declare const $: any;

export class MapManager {
  private containerId: string;
  private container: HTMLElement | null = null;
  private locations: MapLocation[] = [];
  private walls: MapWall[] = [];
  private facilities: MapFacility[] = [];
  private protagonistLocation: string = '';
  private externalAreas: string[] = [];
  private currentMicroLocation: MapLocation | null = null;
  private onActionRequest: (msg: string) => void;

  constructor(containerId: string, onActionRequest: (msg: string) => void) {
    this.containerId = containerId;
    this.onActionRequest = onActionRequest;
    this.refreshContainer();
  }

  private refreshContainer() {
    this.container = document.getElementById(this.containerId) as HTMLElement;
    if (!this.container && typeof $ !== 'undefined') {
      // Fallback to jQuery if document.getElementById fails (e.g. cross-frame issues)
      const $el = $('#' + this.containerId);
      if ($el.length) {
        this.container = $el[0];
      }
    }

    if (!this.container) {
      console.warn(`[MapManager] Map container #${this.containerId} not found during initialization/refresh`);
    } else {
      console.log(`[MapManager] Map container #${this.containerId} found`);
    }
  }

  public focusLocation(locationName: string) {
    const loc = this.locations.find(l => l.name === locationName);
    if (loc) {
      this.enterLocation(loc);
    } else {
      console.warn(`[MapManager] Location not found: ${locationName}`);
    }
  }

  public updateData(locations: MapLocation[], walls: MapWall[], facilities: MapFacility[], protagonistLocation: string, externalAreas: string[] = []) {
    console.log('[地图模块] 接收到更新数据:', {
      地点数量: locations.length,
      墙壁数量: walls.length,
      设施数量: facilities.length,
      主角位置: protagonistLocation,
      外部区域: externalAreas.length
    });
    this.locations = locations;
    this.walls = walls;
    this.facilities = facilities;
    this.protagonistLocation = protagonistLocation;
    this.externalAreas = externalAreas;
    this.render();
    this.renderSidebar();
  }

  public resize() {
    if (!this.container) return;
    const map = (this.container as any)._leaflet_map;
    if (map) {
      map.invalidateSize();
    }
  }

  public render() {
    if (!this.container) {
      this.refreshContainer();
    }

    if (!this.container) {
      console.error('[地图模块] 渲染失败: 找不到地图容器 (即使尝试刷新后)');
      return;
    }

    console.log('[地图模块] 开始渲染地图...');

    // Debug: Check container size and visibility
    const rect = this.container.getBoundingClientRect();
    console.log('[地图模块] 容器尺寸:', rect.width, 'x', rect.height, 'Visibility:', this.container.style.display, 'Parent Display:', this.container.parentElement?.style.display);

    // [Debug] Force container height if zero (Leaflet needs non-zero height)
    if (rect.height === 0) {
        console.warn('[地图模块] 容器高度为0，强制设置最小高度');
        this.container.style.height = '100%';
        this.container.style.minHeight = '400px';
    }

    if (this.currentMicroLocation) {
      // 重新查找最新的地点数据（以防数据更新）
      const updatedLoc = this.locations.find(l => l.name === this.currentMicroLocation?.name);
      if (updatedLoc) {
        console.log('[地图模块] 渲染微观视图:', updatedLoc.name);
        this.currentMicroLocation = updatedLoc;
        this.renderMicro(updatedLoc);
      } else {
        console.warn('[地图模块] 当前微观地点不存在，回退到宏观视图');
        // 如果地点不存在了，返回宏观视图
        this.currentMicroLocation = null;
        this.renderMacro();
      }
    } else {
      console.log('[地图模块] 渲染宏观视图');
      this.renderMacro();
    }

    // 同时刷新侧边栏
    this.renderSidebar();
  }

  private renderSidebar() {
    if (typeof $ === 'undefined') return;
    const $worldList = $('#ci-map-list-world');
    const $localList = $('#ci-map-list-local');

    if (!$worldList.length || !$localList.length) return;

    $worldList.empty();
    $localList.empty();

    // 1. World List
    this.locations.forEach(loc => {
        const isCurrent = loc.name === this.protagonistLocation;
        const $item = $(`
          <div class="ci-map-list-item ${isCurrent ? 'active' : ''}">
            <div class="ci-map-item-content">
                <div class="ci-map-item-title">${loc.name}</div>
                ${loc.desc ? `<div class="ci-map-item-desc">${loc.desc}</div>` : ''}
            </div>
            ${isCurrent ?
                '<div class="ci-map-item-action" style="background:rgba(255,255,255,0.2); color:white; font-size:10px;">当前</div>' :
                '<div class="ci-map-item-action action-go" title="前往"><i class="fas fa-walking"></i></div>'
            }
          </div>
        `);

        // 点击整体聚焦
        $item.on('click', () => {
            this.focusLocation(loc.name);
        });

        // 点击前往按钮
        if (!isCurrent) {
            $item.find('.action-go').on('click', (e: any) => {
                e.stopPropagation();
                this.onActionRequest(`前往 ${loc.name}`);
            });
        }

        $worldList.append($item);
    });

    // External Areas
    if (this.externalAreas && this.externalAreas.length > 0) {
        $worldList.append(`<div class="ci-map-list-header" style="margin-top:10px;">外部区域</div>`);
        this.externalAreas.forEach(area => {
            const $item = $(`
              <div class="ci-map-list-item">
                <div class="ci-map-item-content">
                    <div class="ci-map-item-title">${area}</div>
                </div>
                <div class="ci-map-item-action"><i class="fas fa-external-link-alt"></i></div>
              </div>
            `);
            $item.on('click', () => this.onActionRequest(`前往 ${area}`));
            $worldList.append($item);
        });
    }

    // 2. Local List
    const currentLoc = this.locations.find(l => l.name === this.protagonistLocation);
    if (currentLoc) {
        let hasContent = false;
        // Elements
        if (currentLoc.elements && currentLoc.elements.length > 0) {
            hasContent = true;
            $localList.append(`<div class="ci-map-list-header">可交互元素</div>`);
            currentLoc.elements.forEach((el: any) => {
                const $item = $(`
                    <div class="ci-map-list-item">
                        <div class="ci-map-item-content">
                            <div class="ci-map-item-title">${el.name}</div>
                            ${el.desc ? `<div class="ci-map-item-desc">${el.desc}</div>` : ''}
                        </div>
                        <div class="ci-map-item-action"><i class="fas fa-hand-pointer"></i></div>
                    </div>
                `);
                $item.on('click', (e: any) => {
                    this.handleElementClick(el, e);
                });
                $localList.append($item);
            });
        }

        // Facilities
        const locFacilities = this.facilities.filter(f => f.sceneId === currentLoc.name);
        if (locFacilities.length > 0) {
             const interactiveFurniture = locFacilities.filter(f => f.interactions && f.interactions.length > 0);
             if (interactiveFurniture.length > 0) {
                 hasContent = true;
                 $localList.append(`<div class="ci-map-list-header">场景设施</div>`);
                 interactiveFurniture.forEach(f => {
                     const $item = $(`
                        <div class="ci-map-list-item">
                            <div class="ci-map-item-content">
                                <div class="ci-map-item-title">${f.name}</div>
                                ${f.description ? `<div class="ci-map-item-desc">${f.description}</div>` : ''}
                            </div>
                            <div class="ci-map-item-action"><i class="fas fa-cog"></i></div>
                        </div>
                     `);
                     $item.on('click', (e: any) => {
                          this.handleElementClick(f, e);
                     });
                     $localList.append($item);
                 });
             }
        }

        if (!hasContent) {
            $localList.html('<div style="padding:20px; text-align:center; color:#999;">当前区域无可交互内容</div>');
        }
    } else {
        $localList.html('<div style="padding:20px; text-align:center; color:#999;">当前不在已知区域内</div>');
    }
  }

  private renderMacro() {
    if (!this.container) return;

    // 确保容器有高度，Leaflet 需要
    if (this.container.clientHeight === 0) {
      console.warn('[地图模块] 容器高度为0，尝试强制设置为100%');
      this.container.style.height = '100%';
    }

    console.log('[MapManager] Rendering Macro Map'); // Debug log

    renderMacroMap(
      this.container,
      this.locations,
      this.walls,
      this.protagonistLocation,
      (loc: MapLocation) => this.enterLocation(loc)
    );
  }

  private renderMicro(loc: MapLocation) {
    if (!this.container) return;

    if (this.container.clientHeight === 0) {
      this.container.style.height = '100%';
    }

    console.log('[MapManager] Rendering Micro Map for:', loc.name); // Debug log

    // Filter walls and facilities for this location
    const locWalls = this.walls.filter(w => w.sceneId === loc.name);
    const locFacilities = this.facilities.filter(f => f.sceneId === loc.name);

    // Elements are already associated in index.ts logic, but let's ensure we use them
    const locElements = loc.elements || [];

    renderMicroMap(
      this.container,
      loc,
      locWalls,
      locFacilities,
      locElements,
      (el, e) => this.handleElementClick(el, e),
      () => this.exitLocation()
    );
  }

  private enterLocation(loc: MapLocation) {
    this.currentMicroLocation = loc;
    this.renderMicro(loc);
  }

  private exitLocation() {
    this.currentMicroLocation = null;
    this.renderMacro();
  }

  private handleElementClick(el: MapElement | MapFacility, e: any) {
    console.log('[MapManager] handleElementClick triggered for:', el.name, el);
    // Check if it's a MapElement (has interactions array) or MapFacility (has interaction string)
    const interactions: string[] = [];

    if ('interactions' in el && el.interactions) {
      interactions.push(...el.interactions);
    }

    let desc = '';
    // Try to get description from various possible properties
    if ('description' in el) desc = (el as any).description;
    else if ('desc' in el) desc = (el as any).desc;

    // Debug log for description extraction
    console.log('[MapManager] Extracted description:', desc);

    if (interactions.length > 0) {
      this.showInteractionMenu(e.clientX, e.clientY, el.name, interactions, desc);
    } else {
      // 默认操作
      this.showInteractionMenu(e.clientX, e.clientY, el.name, [], desc);
    }
  }

  private showInteractionMenu(x: number, y: number, name: string, interactions: string[], desc?: string) {
    // 添加观察选项
    const options = [...interactions];
    // 简单判断：如果没有明显的观察选项，添加一个
    const hasObserve = options.some(opt => opt.includes('观察') || opt.includes('查看'));
    if (!hasObserve) {
        options.unshift(`观察 ${name}`);
    }

    showMapPopup(x, y, options, (opt) => {
        this.onActionRequest(opt);
    }, name, desc);
  }
}
