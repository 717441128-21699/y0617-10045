import { FlowDefinition, FlowInstance, Task } from './types';

class DataStore {
  private definitions: Map<string, FlowDefinition> = new Map();
  private instances: Map<string, FlowInstance> = new Map();
  private tasks: Map<string, Task> = new Map();

  saveDefinition(def: FlowDefinition): void {
    this.definitions.set(def.id, def);
  }

  getDefinition(id: string): FlowDefinition | undefined {
    return this.definitions.get(id);
  }

  listDefinitions(): FlowDefinition[] {
    return Array.from(this.definitions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  deleteDefinition(id: string): boolean {
    return this.definitions.delete(id);
  }

  saveInstance(instance: FlowInstance): void {
    this.instances.set(instance.id, instance);
  }

  getInstance(id: string): FlowInstance | undefined {
    return this.instances.get(id);
  }

  listInstances(): FlowInstance[] {
    return Array.from(this.instances.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  saveTask(task: Task): void {
    this.tasks.set(task.id, task);
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  listTasksByAssignee(assignee: string): Task[] {
    return Array.from(this.tasks.values())
      .filter(t => t.assignee === assignee && t.status === 'pending')
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  listAllTasksByAssignee(assignee: string): Task[] {
    return Array.from(this.tasks.values())
      .filter(t => t.assignee === assignee)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  listTasksByInstance(instanceId: string): Task[] {
    return Array.from(this.tasks.values())
      .filter(t => t.instanceId === instanceId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
}

export const store = new DataStore();
