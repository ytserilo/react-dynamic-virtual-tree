import { ListItem } from "./index";

export class Layer {
  public children: Layer[] = [];
  public listItem: ListItem;
  public parent: Layer | undefined;

  constructor(listItem: ListItem) {
    this.listItem = listItem;
  }

  public addChildren(layers: Layer[]) {
    const clearFunctions: Array<() => void> = [];
    layers.forEach((layer) => {
      layer.parent = this;
      clearFunctions.push(this.addChild(layer));
    });

    return () => {
      clearFunctions.forEach((clear) => {
        clear();
      });
    };
  }

  public remove() {
    const parent = this.parent;
    if (!parent) {
      throw new Error("You cannot remove root");
    }

    this.listItem.remove();
    const index = parent.children.findIndex((item) => item === this);
    if (index !== -1) {
      parent.children.splice(index, 1);
    }
  }

  public getRoot = (layer: Layer): Layer => {
    if (layer.parent) {
      return this.getRoot(layer.parent);
    } else {
      return layer;
    }
  };

  public getLayersByLevel(level: number): Layer[] {
    const root = this.getRoot(this);
    const layers: Layer[] = [];
    const diveIntoLayer = (layer: Layer, level: number) => {
      if (level === 0) {
        layers.push(layer);
      } else {
        layer.children.forEach((item) => {
          diveIntoLayer(item, level - 1);
        });
      }
    };

    diveIntoLayer(root, level);
    return layers;
  }

  public addChild(layer: Layer) {
    layer.parent = this;
    this.children.push(layer);

    return () => {
      const index = this.children.findIndex((item) => item === layer);
      if (index !== -1) {
        this.children.splice(index, 1);
      }
    };
  }
}
