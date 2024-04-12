import { supabase } from '../lib/supabase'
var delay = 10
// var key = require('../secret.js')
var time

// 获取access_token
async function getToken(callback) {
  wx.login({
    success: async function (res) {
      const { data:{user}, error } = await supabase.auth.signInWithWechat({code:res.code});
      if(user){  
        typeof callback == "function" && callback(user)
      }else if(error){
        throw error.message || error.error_description
      }
    },
    fail: function (res) {
      if (res.errMsg) {
        console.log('用户拒绝授权', res)
        typeof callback == "function" && callback({ errMsg: "userDenyed" })
      }
    }
  });
}


var translateMonth = function (month) {
  month = month * 1 + 1
  if (month < 10) {
    return month = '0' + month
  }
  else return month = month + ''
}

var translateWeek = function (week) {
  switch (week) {
    case 0:
      return '星期日';
    case 1:
      return '星期一';
    case 2:
      return '星期二';
    case 3:
      return '星期三';
    case 4:
      return '星期四';
    case 5:
      return '星期五';
    case 6:
      return '星期六';
    default:
  }
}


function loadStaffDate(value, id, callback) {
  // var newdate = new Date(value);
  // var month;
  // if (newdate.getMonth() < 10) {
  //   month = '0' + (newdate.getMonth() + 1)
  // }
  // wx.request({
  //   url: Api.staffsigns + id,
  //   data: {
  //     today: newdate.getFullYear() + '-' + month,
  //     token: wx.getStorageSync('token')
  //   },
  //   method: 'GET',
  //   success: (res) => {
  //     //服务器返回的员工某月的打卡纪录
  //     console.log(res)
  //     typeof callback == "function" && callback(newdate.getDay(), res)
  //   },
  //   fail: function (fail) {
  //     console.log(fail)
  //   },
  // })
}
function obtainIndate(cb) {
  var obtainInday = new Date()
  obtainInday.setMonth(obtainInday.getMonth() + 1)
  var month = obtainInday.getMonth(), day = obtainInday.getDate()
  if (month < 10)
    month = '0' + month
  if (day < 10)
    day = '0' + day
  typeof cb == "function" && cb(obtainInday.getFullYear()
    + '-' + month
    + '-' + day)
}

var checkToken = async function (cb) {
const { data, error } = await supabase.auth.getSession()
  if (error) {
     typeof cb == 'function' && cb('invail')
      throw error.message || error.error_description
  } else {
     typeof cb == 'function' && cb('good')
  }
}
function disable(seconds, total, callback) {
  if (total != '')
    delay = total
  delay--;
  if (delay == 0) {
    delay = 10
    clearTimeout(time)
    typeof callback == "function" && callback(false)
    console.log('清除了定时器')
  } else {
    console.log('重开了定时器计时' + delay)
    time = setTimeout(() => { this.disable(seconds,'', callback) }, seconds);
  }

}
async function insertPunch(param,callback) {
          const { data, error } = await supabase
          .from('punch_list')
          .insert([
            param])
          .select()
  if (data) {
    typeof callback == "function" && callback(true)
  } else if(error) {
    typeof callback == "function" && callback(false)
  }

}
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // 地球半径，单位：米
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // 返回以米为单位的距离
}
 function isWithinPunchArea(userLat, userLon, centerLat = 30.59276, centerLon = 114.30525, radius = 500) {
  const distance = calculateDistance(userLat, userLon, centerLat, centerLon);
  return distance <= radius
}
const formatTime = dates => {
  let date = new Date(dates)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

async function getpunchList (callback){
  var token = wx.getStorageSync('token');
  const { data, error } = await supabase
  .from('punch_list').select().eq('user_id',token.id)
if (data) {
  data.forEach(i =>{
    i.created_at = formatTime(i.created_at)
  })
typeof callback == "function" && callback(data)
} else if(error) {
typeof callback == "function" && callback(false)
}
}

async function quitCompany (callback){
  const { error } = await supabase.auth.signOut()
if (error) {
  typeof callback == "function" && callback(false)
} else {
  wx.setStorageSync('userType', 'user')
  wx.removeStorage({
    key: 'token',
  })
typeof callback == "function" && callback(true)
}
}
module.exports = {
  getToken: getToken,
  checkToken: checkToken,
  translateMonth: translateMonth,
  translateWeek: translateWeek,
  loadStaffDate: loadStaffDate,
  obtainIndate: obtainIndate,
  disable: disable,
  isWithinPunchArea:isWithinPunchArea,
  insertPunch:insertPunch,
  formatTime:formatTime,
  getpunchList:getpunchList,
  quitCompany:quitCompany
}