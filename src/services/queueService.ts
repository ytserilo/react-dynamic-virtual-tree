export type Task = () => void;

export interface TaskObj {
  taskId: string;
  task: Task;
  readyCallback: () => void;
}

interface RejectInterface {
  pushAnyway: () => Promise<void>;
}

const queue = () => {
  const tasks: Record<number, TaskObj[]> = {};

  const doTasks = async () => {
    const priorityArray = Object.keys(tasks)
      .map((item) => Number(item))
      .filter((item) => tasks[item].length > 0)
      .sort((a, b) => b - a);

    if (priorityArray.length === 0) {
      return;
    }
    const currentPriority = priorityArray[priorityArray.length - 1];
    const [taskObj] = tasks[currentPriority].splice(0, 1);

    await taskObj.task();
    taskObj.readyCallback();
    await doTasks();
  };

  return {
    pushTask: (taskId: string, task: Task, priority: number = 0): Promise<void> => {
      const executor = (resolve: () => void, reject: (res: RejectInterface) => void) => {
        const taskObj = Object.values(tasks)
          .flat(1)
          .find((taskItem) => taskItem.taskId === taskId);

        if (taskObj) {
          reject({
            pushAnyway: () => {
              return new Promise<void>((resolve) => {
                tasks[priority].push({
                  taskId,
                  task,
                  readyCallback: resolve,
                });
              });
            },
          });
          return;
        }

        if (!tasks[priority]) {
          tasks[priority] = [];
        }
        tasks[priority].push({
          taskId,
          task,
          readyCallback: resolve,
        });
        Object.values(tasks).flat(1).length === 1 && doTasks();
      };
      return new Promise<void>(executor);
    },
  };
};

export const queueObj = queue();
