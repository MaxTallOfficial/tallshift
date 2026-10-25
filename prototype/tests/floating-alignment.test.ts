import test from 'node:test';
import assert from 'node:assert/strict';
import { floatingLeft } from '../src/foundations/floating-alignment.ts';
test('right-edge dropdown flips to the trigger right edge before viewport clamping', () => {
 assert.equal(floatingLeft({left:900,right:960},252,{left:0,width:1000},'start'),708);
 assert.equal(floatingLeft({left:240,right:300},252,{left:0,width:320},'start'),48);
});
test('left-edge dropdown flips to the trigger left edge when end alignment cannot fit', () => {
 assert.equal(floatingLeft({left:24,right:100},252,{left:0,width:1000},'end'),24);
});
test('requested alignment is retained when it fits; viewport offsets and gutters are respected', () => {
 assert.equal(floatingLeft({left:300,right:400},252,{left:0,width:1000},'end'),148);
 assert.equal(floatingLeft({left:300,right:400},252,{left:0,width:1000},'start'),300);
 assert.equal(floatingLeft({left:430,right:490},252,{left:200,width:320},'start'),238);
 assert.equal(floatingLeft({left:5,right:25},296,{left:0,width:320},'end'),12);
});
