import { Listener } from "./listener";
import { Layer, ListItem } from "./index";

export type ItemCompareFunction = (item: ListItem) => boolean;
export type SliceItem = { item: ListItem; top: number; compare: ItemCompareFunction };
export type MarkupItem = [number, ListItem, ItemCompareFunction];
export type VirtualTreeLayerItem = { listItem: ListItem; layer: Layer };
export type VirtualTreeLayer = Array<VirtualTreeLayerItem>;

const UPDATE = "update";
const READY = "ready";
const ON_VIRTUAL_TREE = "onVirtualTree";

const sum = (nums: number[]): number => {
  return nums.reduce((acc, item) => {
    return acc + item;
  }, 0);
};

export class VirtualTree extends Listener {
  private markup: Array<MarkupItem> = [];
  private totalHeight: number = 0;
  private lastSlice: [number, number, SliceItem[]] | undefined;

  private flatListItem(listItem: ListItem): Array<MarkupItem> {
    const result: Array<MarkupItem> = [];

    const func = (listItem: ListItem, additionalHeight: number = 0) => {
      const currentHeight = listItem.currentHeight || 0;
      if (listItem.children.length === 0) {
        const parents = listItem.getParents();
        result.push([
          currentHeight + additionalHeight,
          listItem,
          (item) => {
            if (item.id !== listItem.id) {
              return !!parents.find((parentItem) => parentItem.id === item.id);
            }
            return item.id === listItem.id;
          },
        ]);
        return;
      }

      listItem.children.forEach((item, index) => {
        if (index === 0) {
          func(item, currentHeight + additionalHeight);
        } else {
          func(item);
        }
      });
    };

    func(listItem);

    return result;
  }

  public getSlice(start: number, end: number) {
    if (this.lastSlice && this.lastSlice[0] === start && this.lastSlice[1] === end) {
      return this.lastSlice[2];
    }
    let step = sum(this.markup.slice(0, start).map((item) => item[0]));

    const slice = this.markup.slice(start, end);
    const res = slice.map((item) => {
      const result = { item: item[1], top: step, compare: item[2] };
      step += item[0];
      return result;
    });

    this.lastSlice = [start, end, res];
    return res;
  }

  public update(rootListItem: ListItem, id?: string) {
    this.markup = this.flatListItem(rootListItem);
    this.totalHeight = this.markup.reduce((acc, item) => {
      return acc + item[0];
    }, 0);
    this.lastSlice = undefined;
    this.dispatch<string | undefined>(UPDATE, id);
  }

  public getTotalHeight() {
    return this.totalHeight;
  }

  public onVirtualTree(callback: (result: [VirtualTreeLayerItem, () => void]) => void) {
    this.onListen<[VirtualTreeLayerItem, () => void]>(ON_VIRTUAL_TREE, callback);
  }

  public pushNewVirtualTree(result: [VirtualTreeLayerItem, () => void]) {
    this.dispatch<[VirtualTreeLayerItem, () => void]>(ON_VIRTUAL_TREE, result);
  }

  public onUpdate(callback: (id?: string) => void) {
    return this.onListen<string | undefined>(UPDATE, callback);
  }

  public onReady(callback: () => void) {
    return this.onListen<boolean>(READY, callback);
  }

  public ready() {
    this.dispatch<boolean>(READY, true);
  }

  public onOffset(callback: (arr: [number, number]) => void) {
    return this.onListen<[number, number]>("offset", callback);
  }

  public pushOffset(slice: [number, number]) {
    this.dispatch<[number, number]>("offset", slice);
  }

  public getOffset(scrollTop: number, height: number, overScan: number = 0): [number, number] {
    let startIndex = 0;
    let endIndex = 0;
    let sum = 0;

    for (let i = 0; i < this.markup.length; i++) {
      const obj = this.markup[i];
      sum += obj[0];
      if (sum >= scrollTop) {
        startIndex = i;
        break;
      }
    }

    sum = 0;
    for (let i = startIndex; i < this.markup.length; i++) {
      const obj = this.markup[i];
      sum += obj[0];
      if (sum >= height) {
        endIndex = i;
        break;
      }
    }
    if (endIndex <= startIndex) {
      endIndex = this.markup.length;
    }
    return [
      startIndex - overScan < 0 ? 0 : startIndex - overScan,
      endIndex + overScan > this.markup.length ? this.markup.length : endIndex + overScan,
    ];
  }
}
