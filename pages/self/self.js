// pages/self/self.js

var util = require('../../utils/util.js')

Page({
  data: {
    date: '2017-03-02',
    lists: []
  },
  onLoad: function (options) {
    // 页面初始化 options为页面跳转所带来的参数
    this.setData({
      token: wx.getStorageSync('token')
    })
    wx.getSystemInfo({
      success: (res) => {
        this.setData({
          winWidth: res.windowWidth,
          winHeight: res.windowHeight
        })
      }
    })
  },
  onReady: function () {
    // 页面渲染完成
  },
  onShow: function () {
    // 页面显示
    util.obtainIndate((Inday) => {
      this.setData({
        date: Inday
      })
      this.getSelfClockList()
    })

  },
  onHide: function () {
    // 页面隐藏
  },
  onUnload: function () {
    // 页面关闭
  },

  getSelfClockList: function () {
    util.getpunchList((data) => {
      if (data) {
          this.setData({
            lists: data
          })
      }
      else {

      }
    })
  },

  handleQuit: function () {
    wx.showModal({
      title: '警告',
      content: '退出之后将删除所有个人信息，您确定么？',
      success: (res) => {
        if (res.confirm) {
          console.log('用户点击确定')
          this.quitCompany()
        }
      }
    })
  },

  quitCompany: function () {
    util.quitCompany((res) => {
      if(res){
        wx.navigateTo({
          url: '/pages/login/login',
        })
      }
      
    })
  },

  //日期监听
  bindDateChange: function (e) {
    this.setData({
      date: e.detail.value
    })
    this.getSelfClockList()
  },
})