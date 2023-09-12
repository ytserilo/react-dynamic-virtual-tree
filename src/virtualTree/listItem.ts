import { Listener, ListenerCallback } from "./listener";

const LIST_ITEM_HEIGHT_EVENT = "listItemHeightEvent";
const CHILDREN_READY = "childrenReady";

export interface ListItemHeightTree {
  id: string;
  height: number;
  children: Record<string, ListItemHeightTree>;
}

export class ListItem extends Listener {
  public currentHeight: number | undefined;
  public defaultHeight: number = 0;
  public childCounter: number = 0;
  public additionalHeights: Record<string, number> = {};
  public children: ListItem[] = [];
  public parent: ListItem | undefined;
  public id: string;
  private memorizedState: any;

  constructor(id: any, initialHeight?: number) {
    super();
    if (initialHeight) {
      this.currentHeight = initialHeight;
    }
    this.id = id;
  }

  public memorizeState<T>(state: T) {
    this.memorizedState = state;
  }

  public getMemorizedState<T>(): T | undefined {
    return this.memorizedState;
  }

  public onUpdateHeight(callback: ListenerCallback<number>) {
    return this.onListen<number>(LIST_ITEM_HEIGHT_EVENT, callback);
  }

  public onChildrenReady(callback: ListenerCallback<undefined>) {
    return this.onListen<undefined>(CHILDREN_READY, callback);
  }

  public addChildren(children: ListItem[], ready?: () => void) {
    const clearFunctions: Array<() => void> = [];

    const promises: Promise<void>[] = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      child.parent = this;

      let clearFunction: () => void = () => {};
      const promise = new Promise<void>((resolve) => {
        clearFunction = this.addChild(child, resolve);
      });

      promises.push(promise);
      clearFunctions.push(clearFunction);
    }

    Promise.all(promises).finally(() => {
      this.dispatch<undefined>(CHILDREN_READY, undefined);
      ready && ready();
    });
    return () => {
      clearFunctions.forEach((callback) => callback());
    };
  }

  private addChild(child: ListItem, ready?: () => void) {
    let clearFunctions: Array<() => void> = [];

    const childId = `child-${this.childCounter}`;
    this.childCounter += 1;

    child.parent = this;

    const initClearListener = child.onUpdateHeight((childHeight: number) => {
      this.additionalHeights[childId] = childHeight;

      ready && ready();
      initClearListener();

      const clearListener = child.onUpdateHeight((childHeight: number) => {
        this.additionalHeights[childId] = childHeight;
        this.dispatch<number>(LIST_ITEM_HEIGHT_EVENT, this.height);
      });
      this.dispatch<number>(LIST_ITEM_HEIGHT_EVENT, this.height);
      clearFunctions.push(clearListener);
    });

    this.children.push(child);

    return () => {
      const index = this.children.findIndex((item) => item === child);
      clearFunctions.forEach((callback) => callback());
      if (index !== -1) {
        this.children.splice(index, 1);
        delete this.additionalHeights[childId];
      }
    };
  }

  public remove() {
    const parent = this.parent;
    if (!parent) {
      return;
    }

    const index = parent.children.findIndex((item) => item === this);
    this.removeAllListeners();
    if (index !== -1) {
      parent.children.splice(index, 1);
    }
  }

  public getAbsoluteTop() {
    const parent = this.parent;
    if (!parent) {
      return 0;
    }

    const index = parent.children.findIndex((item) => item === this);
    if (index === -1) {
      return 0;
    }

    let top = 0;
    for (let i = 0; i < index; i++) {
      top += parent.children[i].height;
    }

    return top;
  }

  public genListItemHeightTree() {
    const root: ListItemHeightTree = { id: this.id, children: {}, height: this.currentHeight || this.defaultHeight };

    const saveHeight = (listItem: ListItem, dct: ListItemHeightTree) => {
      const currentItem = {
        id: listItem.id,
        children: {},
        height: listItem.currentHeight !== undefined ? listItem.currentHeight : listItem.defaultHeight,
      };
      dct.children[listItem.id] = currentItem;
      listItem.children.forEach((child) => {
        saveHeight(child, currentItem);
      });
    };

    this.children.forEach((child) => {
      saveHeight(child, root);
    });

    return root;
  }

  public getChild(id: string) {
    return this.children.find((listItem) => listItem.id === id);
  }

  public setListItemHeightTree(rootTree: ListItemHeightTree) {
    const setHeight = (tree: ListItemHeightTree, listItem: ListItem) => {
      listItem.editHeight(tree.height);

      Object.values(tree.children).forEach((childItem) => {
        const item = listItem.getChild(childItem.id);
        if (!item) {
          return;
        }
        setHeight(childItem, item);
      });
    };

    Object.values(rootTree.children).forEach((childItem) => {
      const item = this.getChild(childItem.id);
      if (!item) {
        return;
      }
      setHeight(childItem, item);
    });
  }

  public setChildrenHeight(height: number, depth?: number) {
    const editHeight = (listItem: ListItem, currentDepth: number | undefined) => {
      if (depth === 0) {
        return;
      }

      listItem.children.forEach((child) => {
        child.editHeight(height);
        editHeight(child, currentDepth === undefined ? currentDepth : currentDepth - 1);
      });
    };

    editHeight(this, depth);
  }

  get height() {
    const currentHeight = this.currentHeight || 0;
    return (
      currentHeight +
      Object.values(this.additionalHeights).reduce((acc, item) => {
        return acc + item;
      }, 0)
    );
  }

  set height(value: number) {
    this.defaultHeight = value;
    this.currentHeight = value;
    this.dispatch<number>(LIST_ITEM_HEIGHT_EVENT, this.height);
  }

  public editHeight(value: number) {
    this.currentHeight = value;
    this.dispatch<number>(LIST_ITEM_HEIGHT_EVENT, this.height);
  }

  public getParents(): ListItem[] {
    const parents: ListItem[] = [];

    const func = (listItem: ListItem) => {
      if (listItem.parent) {
        parents.push(listItem.parent);
        func(listItem.parent);
      }
    };
    func(this);
    return parents;
  }
}
