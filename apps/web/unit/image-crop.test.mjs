import test from 'node:test';
import assert from 'node:assert/strict';
import {cropRectangle} from '../src/lib/image-crop.ts';
test('square portrait centers landscape photos and keeps the crop inside source bounds',()=>{
  assert.deepEqual(cropRectangle(600,300,1,1,.5,.5),{x:150,y:0,width:300,height:300});
  for(const [width,height] of [[4000,3000],[90,600],[200,200]]) for(const aspect of [1,3]) for(const zoom of [1,1.5,3,9]) for(const x of [-1,0,.5,1,4]) {
    const r=cropRectangle(width,height,aspect,zoom,x,1-x);
    assert.ok(r.x>=0 && r.y>=0 && r.width>0 && r.height>0);
    assert.ok(r.x+r.width<=width+1e-6 && r.y+r.height<=height+1e-6);
    assert.ok(Math.abs(r.width/r.height-aspect)<1e-6);
  }
});
test('cover crop preserves a full panorama and zoom exposes bounded panning',()=>{
  assert.deepEqual(cropRectangle(1200,400,3,1,.5,.5),{x:0,y:0,width:1200,height:400});
  const left=cropRectangle(1200,400,1,2,0,.5),right=cropRectangle(1200,400,1,2,1,.5);
  assert.equal(left.x,0); assert.equal(right.x+right.width,1200);
});
