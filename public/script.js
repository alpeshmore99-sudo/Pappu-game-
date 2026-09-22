var socket = io();
var currentChip = 5;
var userPoints = 4150;
var totalBet = 0;
var winPoints = 0;
var isConfirmed = false;
var isBettingLocked = false;
var currentRotation = 0;

var items = [
  { id: 'chhatri', icon: '☂️' }, { id: 'ball', icon: '⚽' }, { id: 'sun', icon: '☀️' },
  { id: 'lamp', icon: '🪔' }, { id: 'cow', icon: '🐄' }, { id: 'bucket', icon: '🪣' },
  { id: 'kite', icon: '🪁' }, { id: 'top', icon: '🪀' }, { id: 'flower', icon: '🌸' },
  { id: 'butterfly', icon: '🦋' }, { id: 'pigeon', icon: '🕊️' }, { id: 'rabbit', icon: '🐇' }
];

var bets = {};
items.forEach(function(i){ bets[i.id] = 0; });

var wheel = document.getElementById('wheel');
if (wheel) {
  items.forEach(function(item, index) {
    var angle = index * 30;
    var el = document.createElement('div');
    el.className = 'wheel-item';
    el.style.transform = 'rotate(' + angle + 'deg)';
    el.innerHTML = item.icon;
    wheel.appendChild(el);
  });
}

function selectChip(val, element) {
  if (isBettingLocked) return;
  currentChip = val;
  document.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('active'); });
  element.classList.add('active');
}

var holdTimer = null;

function addBet(itemId) {
  if (isConfirmed || isBettingLocked) return;
  if (userPoints < currentChip) return;

  userPoints -= currentChip;
  bets[itemId] += currentChip;
  totalBet += currentChip;

  updateUI();
  socket.emit('player-bet-update', { symbol: itemId, amount: currentChip });
}

items.forEach(function(i) {
  var cardEl = document.getElementById('card-' + i.id);
  if (cardEl) {
    cardEl.addEventListener('pointerdown', function(e) {
      e.preventDefault();
      addBet(i.id);
      
      clearInterval(holdTimer);
      holdTimer = setInterval(function() {
        addBet(i.id);
      }, 150);
    });

    cardEl.addEventListener('pointerup', function() { clearInterval(holdTimer); });
    cardEl.addEventListener('pointerleave', function() { clearInterval(holdTimer); });
    cardEl.addEventListener('pointercancel', function() { clearInterval(holdTimer); });
  }
});

function updateUI() {
  document.getElementById('pts').innerText = userPoints;
  document.getElementById('total-bet').innerText = totalBet;
  
  items.forEach(function(i){
    var badgeEl = document.getElementById('b-' + i.id);
    var val = bets[i.id];
    
    if (badgeEl) {
      if (val > 0) {
        badgeEl.innerText = val;
        badgeEl.classList.add('visible');
      } else {
        badgeEl.innerText = '';
        badgeEl.classList.remove('visible');
      }
    }
  });
}

function cancelBets() {
  if (isConfirmed || isBettingLocked) return;
  userPoints += totalBet;
  totalBet = 0;
  items.forEach(function(i){ bets[i.id] = 0; });
  updateUI();
}

function confirmBets() {
  isConfirmed = true;
  document.getElementById('btn-ok').disabled = true;
  document.getElementById('btn-cancel').disabled = true;
}

function lockBetting() {
  isBettingLocked = true;
  confirmBets();
  
  var cards = document.querySelectorAll('.card');
  cards.forEach(function(card) {
    card.classList.add('disabled');
  });
}

function unlockBetting() {
  isBettingLocked = false;
  isConfirmed = false;
  document.getElementById('btn-ok').disabled = false;
  document.getElementById('btn-cancel').disabled = false;
  
  var cards = document.querySelectorAll('.card');
  cards.forEach(function(card) {
    card.classList.remove('disabled');
  });
}

socket.on('timer-update', function(time) {
  document.getElementById('timer').innerText = time;

  if (time <= 10 && !isBettingLocked) {
    lockBetting();
  }

  if (time === 60) {
    resetRound();
  }
});

socket.on('spin-wheel', function(winnerSymbol) {
  spinWheel(winnerSymbol);
});

function spinWheel(winnerSymbol) {
  clearFlashing();

  var wheelBox = document.getElementById('wheel-box');
  var overlay = document.getElementById('overlay');
  
  overlay.classList.add('active');
  wheelBox.classList.add('popup-active');

  var winningIndex = items.findIndex(i => i.id === winnerSymbol);
  if (winningIndex === -1) winningIndex = 0;
  var winner = items[winningIndex];

  var targetAngle = 360 - (winningIndex * 30);
  currentRotation += 1440 + targetAngle - (currentRotation % 360);

  setTimeout(function() {
    wheel.style.transform = 'rotate(' + currentRotation + 'deg)';
  }, 300);

  setTimeout(function() {
    document.getElementById('wheel-center').innerText = winner.icon;

    setTimeout(function() {
      overlay.classList.remove('active');
      wheelBox.classList.remove('popup-active');

      var winCard = document.getElementById('card-' + winner.id);
      if (winCard) winCard.classList.add('flash-winner');
      document.getElementById('wheel-center').classList.add('flash-winner');

      var hList = document.getElementById('hist-list');
      var newHist = document.createElement('span');
      newHist.className = 'hist-item';
      newHist.innerText = winner.icon;
      hList.prepend(newHist);
      if (hList.children.length > 10) hList.removeChild(hList.lastChild);

      if (bets[winner.id] > 0) {
        winPoints = bets[winner.id] * 10;
        document.getElementById('winner-val').innerText = winPoints;
        document.getElementById('btn-take').classList.add('flash-take');
      } else {
        winPoints = 0;
        document.getElementById('winner-val').innerText = '0';
      }
    }, 800);

  }, 3800);
}

function takeWin() {
  if (winPoints > 0) {
    userPoints += winPoints;
    winPoints = 0;
    document.getElementById('winner-val').innerText = '0';
    document.getElementById('btn-take').classList.remove('flash-take');
    updateUI();
  }
}

function clearFlashing() {
  items.forEach(function(i){
    var card = document.getElementById('card-' + i.id);
    if (card) card.classList.remove('flash-winner');
  });
  document.getElementById('wheel-center').classList.remove('flash-winner');
  document.getElementById('btn-take').classList.remove('flash-take');
}

function resetRound() {
  clearFlashing();
  totalBet = 0;
  unlockBetting();
  items.forEach(function(i){ bets[i.id] = 0; });
  updateUI();
}

function toggleFullScreen() {
  var doc = window.document;
  var docEl = doc.documentElement;

  var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
  var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

  if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
    requestFullScreen.call(docEl);
  } else {
    cancelFullScreen.call(doc);
  }
}
