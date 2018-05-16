import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { GestureLockPage } from './gesture-lock';

@NgModule({
  declarations: [
    GestureLockPage,
  ],
  imports: [
    IonicPageModule.forChild(GestureLockPage),
  ]
})
export class GestureLockPageModule {}
