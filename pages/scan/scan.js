// pages/scan/scan.js

//按钮打卡页面

var util = require('../../utils/util.js')
var seconds = 10
var ing //定时器
Page({
  data: {
    encrypt: '',
    wxName: '',
    avatar: '',
    btnStr: '打卡',
    touchBled: false,
  },

   onShareAppMessage: function () {
     return {
       title: '打卡咯',
       path: '/pages/login/login?'
     }
   },


  onLoad: function (options) {
      this.setData({
        token: wx.getStorageSync('token'),
        encrypt: wx.getStorageSync('token').id,
        wxName: wx.getStorageSync('token').user_metadata.username,
        avatar: wx.getStorageSync('token').user_metadata.avatar
      })
  },
  onReady: function () {
    // 页面渲染完成
    // this.getLocation()
    // this.getUserInfo()
  },
  onShow: function () {
    // 页面显示
    this.startTime()
  },
  onHide: function () {
    // 页面隐藏
  },
  onUnload: function () {
    // 页面关闭
  },

  //打卡按钮

  toClock: function () {
    wx.showNavigationBarLoading()
    ing = setInterval(() => { this.sleepOneMinute() }, 1000);
    console.log("2")

    wx.getLocation({
      type: 'wgs84',
      success: (res) => {
        console.log('location', res)
        this.setData({
          touchBled: true
        })
        this.punch(res.latitude, res.longitude)
      },
      fail: (res) => {
        wx.hideNavigationBarLoading()
        this.setData({
          info: '打卡功能需要获取您的地理位置信息，请稍后重试'
        })
      }
    })
  },

  punch: async function (latitude, longitude) {
    var now = new Date()
    console.log(now)
    wx.hideNavigationBarLoading();
    const isWithinPunchArea = await util.isWithinPunchArea(latitude,longitude);
    if(isWithinPunchArea){
      wx.request({
        url: 'https://apis.map.qq.com/ws/geocoder/v1/',
        data: {
          location: `${latitude},${longitude}`,
          key: '',
        },
        success: async function(res) {
          var token = wx.getStorageSync('token');
          const data = { address: res.data.result.address, user_name: token.user_metadata.username,user_id:token.id,userLat:latitude,userLon:longitude };
          util.insertPunch(data, (data) => {
            if (data) {
              wx.navigateTo({
                url: '/pages/success/success?place=' + res.address + '&time=' + data.create_at+'&status=work',
              })
            }
            else {
              if (!res) {
                wx.navigateTo({
                  url: '/pages/fail/fail?info=' + '打卡失败，请重新打卡',
                })
              }
            }
          })
        },
      });
    }else{
      wx.navigateTo({
        url: '/pages/fail/fail?info=' + '超出范围',
      })
    }
  },

  toList: function () {
    wx.navigateTo({
      url: '/pages/self/self',
    })
  },

  startTime: function () {
    var today = new Date();
    var month = today.getMonth();
    var day = today.getDate();
    var week = today.getDay();
    var h = today.getHours();
    var m = today.getMinutes();
    var s = today.getSeconds();// 在小于10的数字钱前加一个‘0’
    month = this.checkTime(month);
    day = this.checkTime(day);
    m = this.checkTime(m);
    s = this.checkTime(s);
    this.setData({
      hours: h,
      minutes: m,
      seconds: s,
      month: util.translateMonth(month),
      day: day,
      week: util.translateWeek(week)
    })

    var t = setTimeout(() => { this.startTime() }, 500);
  },

  checkTime: function (i) {
    if (i < 10) {
      i = "0" + i;
    }
    return i;
  },

  sleepOneMinute: function () {
    if (this.data.touchBled == true) {
      seconds--
      this.setData({
        btnStr: (seconds + ' 秒后可再打卡')
      })
      if (seconds == 0) {
        this.setData({
          btnStr: '打卡',
          touchBled: false,
        })
        seconds = 10
        clearInterval(ing)
      }
    }
  }
})