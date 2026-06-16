import * as fs from 'fs';
import * as path from 'path';
import { FlowDefinition, FlowInstance, Task } from './types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DEFINITIONS_FILE = path.join(DATA_DIR, 'definitions.json');
const INSTANCES_FILE = path.join(DATA_DIR, 'instances.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(file: string, fallback: T): T {
  ensureDataDir();
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch (e) {
    console.error(`Read ${file} failed:`, e);
  }
  return fallback;
}

function writeJSON<T>(file: string, data: T) {
  ensureDataDir();
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Write ${file} failed:`, e);
  }
}

class DataStore {
  private definitions: Map<string, FlowDefinition>;
  private instances: Map<string, FlowInstance>;
  private tasks: Map<string, Task>;

  constructor() {
    this.definitions = new Map(
      Object.entries(readJSON<Record<string, FlowDefinition>>(DEFINITIONS_FILE, {}))
    );
    this.instances = new Map(
      Object.entries(readJSON<Record<string, FlowInstance>>(INSTANCES_FILE, {}))
    );
    this.tasks = new Map(
      Object.entries(readJSON<Record<string, Task>>(TASKS_FILE, {}))
    );
  }

  private persistDefinitions() {
    writeJSON(DEFINITIONS_FILE, Object.fromEntries(this.definitions));
  }

  private persistInstances() {
    writeJSON(INSTANCES_FILE, Object.fromEntries(this.instances));
  }

  private persistTasks() {
    writeJSON(TASKS_FILE, Object.fromEntries(this.tasks));
  }

  saveDefinition(def: FlowDefinition): void {
    this.definitions.set(def.id, def);
    this.persistDefinitions();
  }

  getDefinition(id: string): FlowDefinition | undefined {
    return this.definitions.get(id);
  }

  listDefinitions(): FlowDefinition[] {
    return Array.from(this.definitions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  deleteDefinition(id: string): boolean {
    const result = this.definitions.delete(id);
    if (result) this.persistDefinitions();
    return result;
  }

  saveInstance(instance: FlowInstance): void {
    this.instances.set(instance.id, instance);
    this.persistInstances();
  }

  getInstance(id: string): FlowInstance | undefined {
    return this.instances.get(id);
  }

  listInstances(): FlowInstance[] {
    return Array.from(this.instances.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  saveTask(task: Task): void {
    this.tasks.set(task.id, task);
    this.persistTasks();
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

  cancelTasksForNode(instanceId: string, nodeId: string): void {
    for (const task of this.tasks.values()) {
      if (task.instanceId === instanceId && task.nodeId === nodeId && task.status === 'pending') {
        task.status = 'cancelled' as any;
        this.tasks.set(task.id, task);
      }
    }
    this.persistTasks();
  }
}

export const store = new DataStore();
