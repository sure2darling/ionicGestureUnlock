import {Component, ElementRef, ViewChild, Renderer2} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {Storage} from "@ionic/storage";



export class Point {
  x: number;
  y: number;
  index?: number;
}

export class GestureLockObj {
  password: string;
  chooseType: number;
  step: number;

  constructor() {
    this.chooseType = 3;
    this.step = 0;
  }
}

export class GestureAttemptObj {
  lockDate: number;
  lastAttemptDate: number;
  attemptsNu: number;

  constructor() {
    this.attemptsNu = 3;
  }

}


@IonicPage()
@Component({
  selector: 'page-gesture-lock',
  templateUrl: 'gesture-lock.html',
})
export class GestureLockPage {
  height = 320;
  width = 320;
  chooseType = 3;
  devicePixelRatio; // 设备密度
  titleMes = "手势密码解锁";
  unSelectedColor = '#87888a';
  selectedColor = '#1783CE';
  successColor = '#7bd56c';
  errorColor = '#d54e20';
  lockTimeUnit = 50; //尝试失败后锁定多少秒
  gestureLockObj: GestureLockObj = new GestureLockObj(); //密码本地缓存
  gestureAttemptObj: GestureAttemptObj = new GestureAttemptObj();  //尝试日期和次数本地缓存

  firstPassword: string;
  private canTouch = false;
  private radius: number; //小圆点半径

  private allPointArray: Point[] = [];
  private unSelectedPointArray: Point[] = [];
  private selectedPointArray: Point[] = [];
  private ctx;

  private lockTime = this.lockTimeUnit;

  @ViewChild('canvas') canvas: ElementRef;
  textColor = this.selectedColor;

  constructor(public navCtrl: NavController,
              public navParams: NavParams,
              private render: Renderer2,
              private storage: Storage) {
  }

  ngOnInit() {
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.radius = this.width * this.devicePixelRatio / (1 + 2 * this.chooseType) / 2; // 半径计算
    this.canvas.nativeElement.height = this.height * this.devicePixelRatio;
    this.canvas.nativeElement.width = this.width * this.devicePixelRatio;
    this.ctx = this.canvas.nativeElement.getContext('2d');

    this.initPointArray();
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.drawCircles(this.allPointArray);
    this.bindEvent();

    this.storage.get('gestureLockObj').then(data => {
      if (data) {
        this.gestureLockObj = data;
      }
    });

    this.storage.get('gestureAttemptObj').then(data => {
      if (data) {
        this.gestureAttemptObj = data;

        if (this.gestureAttemptObj.attemptsNu === 0) {
          const now =Date.now();
          const last =this.gestureAttemptObj.lockDate;
          const secend = (now - last) / 1000 - this.lockTimeUnit;
          if (secend <= 0) {
            this.setInteralFun( 1- secend );
          } else {
            this.gestureAttemptObj = new GestureAttemptObj();
            this.storage.set("gestureAttemptObj", this.gestureAttemptObj);
          }
        }
      }
    });

    if (this.gestureLockObj.step === 0) {
      this.titleMes = "请绘制你的手势密码";
    }
  }

  //滑动结束后处理密码
  private dealPassword(selectedArray) {
    if (this.gestureLockObj.step === 2) {   /** 进入解锁 **/
      if (this.checkPassword(selectedArray, this.gestureLockObj.password)) {  // 解锁成功
        this.textColor = this.successColor;
        this.titleMes = '解锁成功';
        this.drawAll(this.successColor);
        this.storage.remove('gestureAttemptObj')
      } else {   //解锁失败
        this.lockFaile();
      }
    } else if (this.gestureLockObj.step === 1) {  // 设置密码确认密码
      if (this.checkPassword(selectedArray, this.firstPassword)) { //设置密码成功
        this.gestureLockObj.step = 2;
        this.gestureLockObj.password = this.firstPassword;
        this.titleMes = '手势密码设置成功，再次绘制登录';

        this.storage.set('gestureLockObj', this.gestureLockObj);
        this.drawAll(this.successColor);

      } else {  //设置密码失败
        this.textColor = this.errorColor;
        this.titleMes = '两次不一致，重新输入';
        this.drawAll(this.errorColor);
        this.gestureLockObj = new GestureLockObj();
      }
    } else if (this.gestureLockObj.step === 0) { //设置密码
      this.gestureLockObj.step = 1;
      this.firstPassword = this.parsePassword(selectedArray);
      this.textColor = this.selectedColor;
      this.titleMes = '再次输入';
    } else if (this.gestureLockObj.step === 3) {//重置密码输入旧秘密
      if (this.checkPassword(selectedArray, this.gestureLockObj.password)) {  // 旧密码成功
        this.gestureLockObj.step = 0;
        this.textColor = this.successColor;
        this.titleMes = '请输入新手势密码';
        this.drawAll(this.successColor);
      } else {   //旧密码失败
        this.lockFaile();
      }
    }
  }

  //解锁失败
  lockFaile() {
    this.drawAll(this.errorColor);
    this.textColor = this.errorColor;
    this.gestureAttemptObj.attemptsNu = this.gestureAttemptObj.attemptsNu - 1;
    if (this.gestureAttemptObj.attemptsNu > 0) {
      this.titleMes = `密码错误，您还可以输入${this.gestureAttemptObj.attemptsNu}次`;
    } else {
      this.gestureAttemptObj.lockDate = Date.now();
      this.storage.set("gestureAttemptObj", this.gestureAttemptObj);
      this.setInteralFun(this.lockTimeUnit);
    }
  }

  setInteralFun(time) { //检查是否超过设定时间
    this.lockTime = time;
    const interval = setInterval(() => {
      this.lockTime = this.lockTime - 1;
      this.titleMes = `请在${this.lockTime}秒后尝试`;
      if (this.lockTime === 0) {
        this.gestureAttemptObj = new GestureAttemptObj();
        this.storage.set("gestureAttemptObj", this.gestureAttemptObj);

        this.lockTime = this.lockTimeUnit;
        this.titleMes = "手势密码解锁";
        clearInterval(interval);
      }
    }, 1000);
  }

  //重置手势秘密
  resetPasswordFun() {
    this.titleMes = '请输入旧手势密码';
    this.gestureLockObj.step = 3;
  }

  deletPasswordFun() {
    this.storage.remove("gestureLockObj");
    this.gestureLockObj = new GestureLockObj();
    this.titleMes = '请绘制你的手势密码';
    this.reset();
  }

  //设置手势密码矩阵
  setChooseType(type) {
    this.chooseType = type;
  }

  //初始化手势点的坐标数组
  private initPointArray() {
    const n = this.chooseType;
    const radius = this.radius;
    this.selectedPointArray = [];
    this.allPointArray = [];
    this.unSelectedPointArray = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const obj = {
          x: (j * 4 + 3) * radius,
          y: (i * 4 + 3) * radius,
          index: ((i * n + 1 + j) + 2) * 7 - 1
        };
        this.allPointArray.push(obj);
        this.unSelectedPointArray.push(obj);
      }
    }
  }

//滑动手势的时候更新画布
  private update(nowPoint: Point) {
    this.drawAll(this.selectedColor, nowPoint);
    this.dealPoint(this.unSelectedPointArray, nowPoint);
  }

  private checkPassword(pointArray, password): boolean {
    return password === this.parsePassword(pointArray);
  }

  private parsePassword(pointArray): string {
    return pointArray.map(data => {
      return data.index;
    }).join("");
  }

  //获得手指滑动点的位置
  private getPosition(e): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.touches[0].clientX - rect.left) * this.devicePixelRatio,
      y: (e.touches[0].clientY - rect.top) * this.devicePixelRatio
    };
  }

  //重置
  reset() {
    this.initPointArray();
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.drawCircles(this.allPointArray);
  }

  //添加滑动监听事件
  private bindEvent() {
    this.render.listen(this.canvas.nativeElement, "touchstart", (e) => {
      e.preventDefault();
      if (this.selectedPointArray.length === 0 && this.gestureAttemptObj.attemptsNu !== 0) {
        this.dealPoint(this.allPointArray, this.getPosition(e), true);
      }
    });
    this.render.listen(this.canvas.nativeElement, "touchmove", (e) => {
      if (this.canTouch) {
        this.update(this.getPosition(e));
      }
    });
    const self = this;
    this.render.listen(this.canvas.nativeElement, "touchend", () => {
      if (this.canTouch) {
        this.canTouch = false;
        this.dealPassword(this.selectedPointArray);
        setTimeout(function () {
          self.reset();
        }, 1000);
      }
    });
  }

  //绘制滑动屏幕后的点
  private drawAll(color, nowPoint = null) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.drawCircles(this.allPointArray);
    this.drawCircles(this.selectedPointArray, color);
    this.drawPoints(this.selectedPointArray, color);
    this.drawLine(this.selectedPointArray, color, nowPoint);
  }

  //滑动点的时候处理是否划中点
  private dealPoint(pointArry: Point[], nowPoint: Point, canTouch = false) {
    for (let i = 0; i < pointArry.length; i++) {
      if (Math.abs(Number(nowPoint.x) - Number(pointArry[i].x)) < this.radius && Math.abs(Number(nowPoint.y) - Number(pointArry[i].y)) < this.radius) {
        if (canTouch) {
          this.canTouch = true;
        }
        this.drawPoint(pointArry[i]);
        this.selectedPointArray.push(pointArry[i]);
        this.unSelectedPointArray.splice(i, 1);
        break;
      }
    }
  }

  private drawPoints(pointArray: Point[], style = this.selectedColor) {
    for (const value of pointArray) {
      this.drawPoint(value, style);
    }
  }

  private drawCircles(pointArray: Point[], style = this.unSelectedColor) {
    for (const value of pointArray) {
      this.drawCircle(value, style);
    }
  }

  //画圈
  private drawCircle(point: Point, style = this.unSelectedColor) {
    this.ctx.strokeStyle = style;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, this.radius, 0, Math.PI * 2, true);
    this.ctx.closePath();
    this.ctx.stroke();
  }

  //画点
  private drawPoint(point: Point, style = this.selectedColor) {
    this.ctx.fillStyle = style;
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, this.radius / 2.5, 0, Math.PI * 2, true);
    this.ctx.closePath();
    this.ctx.fill();
  }

  //划线
  private drawLine(pointArray: Point[], style, nowPoint: Point = null) {
    this.ctx.beginPath();
    this.ctx.strokeStyle = style;
    this.ctx.lineWidth = 3;

    this.ctx.moveTo(pointArray[0].x, pointArray[0].y);
    for (let i = 1; i < pointArray.length; i++) {
      this.ctx.lineTo(pointArray[i].x, pointArray[i].y);
    }
    if (nowPoint) {
      this.ctx.lineTo(nowPoint.x, nowPoint.y);
    }
    this.ctx.stroke();
    this.ctx.closePath();
  }

}


