export type OpPatch = AddPatch | RemovePatch | ReplacePatch | MovePatch | CopyPatch | TestPatch;

interface Patch {
  path: string;
}
interface AddPatch extends Patch {
  op: 'add';
  value: any;
}
interface RemovePatch extends Patch {
  op: 'remove';
}
interface ReplacePatch extends Patch {
  op: 'replace';
  value: any;
}
interface MovePatch extends Patch {
  op: 'move';
  from: string;
}
interface CopyPatch extends Patch {
  op: 'copy';
  from: string;
}
interface TestPatch extends Patch {
  op: 'test';
  value: any;
}
