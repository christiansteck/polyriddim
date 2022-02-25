// *********************************************************************************************************************
// HTMLElements
// *********************************************************************************************************************
const incXBtn = document.getElementById("inc-x")
const decXBtn = document.getElementById("dec-x")
const incYBtn = document.getElementById("inc-y")
const decYBtn = document.getElementById("dec-y")
const playBtn = document.getElementById("play")
const labelElm = document.getElementById('label')
const gridElm = document.getElementById('grid')
const tempoLabelElm = document.getElementById('tempo-label')
const tempoSliderElm = document.getElementById('tempo-slider')
const radioNoteElms = document.getElementsByName('radio-notes')

// *********************************************************************************************************************
// Constants
// *********************************************************************************************************************
const NOTE_LENGTH = 0.05 // beep length in seconds
const SCHEDULE_AHEAD_TIME = 0.25
const NOTE_OPTIONS = ['ONES', 'ALL', 'OTHER']

// *********************************************************************************************************************
// State
// *********************************************************************************************************************
const state = {
  x: 3,
  y: 5,
  bpm: 60,

  noteToBeScheduled: undefined, // next note to be scheduled, number in range [0, x*y)
  nextNoteTime: undefined, // time when next note is to be played
  scheduledNotes: [], // {note: number in range [0, x*y), time: number, audible: bool}
  currentNote: 0, // number in range [0, x*y)

  audioContext: undefined,
  intervalID: undefined, // intervalID of setTimeout which schedules notes

  // Settings
  noteOption: 'ONES',
}

const changeSignature = (key, val) => () => {
  state[key] += val
  renderLabel()
  renderGrid()
  renderSignatureControls()
  renderTempo()
}

// *********************************************************************************************************************
// Shim requestAnimationFrame
// *********************************************************************************************************************

window.requestAnimFrame = (function () {
  return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
      window.setTimeout(callback, 1000 / 60);
    };
})();


// *********************************************************************************************************************
// Grid
// *********************************************************************************************************************
const renderGrid = () => {
  gridElm.style.gridTemplateColumns = Array(state.x).fill("minmax(5px, 50px)").join(' ')
  gridElm.style.gridTemplateRows = Array(state.y).fill("minmax(5px, 50px)").join(' ')

  gridElm.textContent = ''

  for (let i = 0; i < state.x * state.y; i++) {
    const cell = document.createElement("div")
    cell.classList.add('cell');
    if (i % state.x === 0) {
      cell.classList.add('cell--primary')
    }
    if (i % state.y === 0) {
      cell.classList.add('cell--secondary')
    }

    if (state.noteOption === 'OTHER') {
      const isIntermediate = (i % state.x) % 2 === 1
      cell.textContent = isIntermediate ? '&' : `${(i % state.x) / 2 + 1}`
      if (isIntermediate ) cell.classList.add('cell--intermediate')
    } else {
      cell.textContent = `${i % state.x + 1}`
    }


    gridElm.appendChild(cell)
  }
}

const highlightCell = () => {
  gridElm.childNodes.forEach(
    (n, i) => i === state.currentNote ?
      n.classList.add("cell--active") :
      n.classList.remove("cell--active")
  )
}

const animateCells = () => {
  if (!isRunning()) {
    return
  }

  const currentTime = state.audioContext.currentTime

  while (state.scheduledNotes.length && state.scheduledNotes[0].time < currentTime) {
    state.currentNote = state.scheduledNotes[0].note
    state.scheduledNotes.shift()
  }

  highlightCell()

  window.requestAnimFrame(animateCells)
}

// *********************************************************************************************************************
// Header
// *********************************************************************************************************************
const renderLabel = () => {
  labelElm.textContent = `${state.x} vs ${state.y}`
}

const renderSignatureControls = () => {
  incXBtn.disabled = state.x >= 11
  incYBtn.disabled = state.y >= 11
  decXBtn.disabled = state.x <= 2
  decYBtn.disabled = state.y <= 2
}

// *********************************************************************************************************************
// Audio
// *********************************************************************************************************************
const scheduleIntermediateNote = () => {
  if (state.noteOption === 'OTHER' && (state.noteToBeScheduled % state.x) % 2 === 1) {
    return
  }
  if (state.noteToBeScheduled % state.x !== 0 && state.noteToBeScheduled % state.y !== 0) {
    const osc = state.audioContext.createOscillator();
    osc.connect(state.audioContext.destination);
    osc.frequency.value = 220.0

    osc.start(state.nextNoteTime)
    osc.stop(state.nextNoteTime + NOTE_LENGTH / 2)
  }
}

const scheduleNotes = () => {
  while (state.nextNoteTime < state.audioContext.currentTime + SCHEDULE_AHEAD_TIME) {

    const newNote = {note: state.noteToBeScheduled, time: state.nextNoteTime, audible: false}

    if (state.noteToBeScheduled % state.x === 0) {
      const osc = state.audioContext.createOscillator();
      osc.connect(state.audioContext.destination);
      osc.frequency.value = 880.0

      osc.start(state.nextNoteTime)
      osc.stop(state.nextNoteTime + NOTE_LENGTH)

      newNote.audible = true
    }
    if (state.noteToBeScheduled % state.y === 0) {
      const osc = state.audioContext.createOscillator();
      osc.connect(state.audioContext.destination);
      osc.frequency.value = 440.0

      osc.start(state.nextNoteTime)
      osc.stop(state.nextNoteTime + NOTE_LENGTH)

      newNote.audible = true
    }
    if (state.noteOption === 'ALL' || state.noteOption === 'OTHER') {
      scheduleIntermediateNote()
    }

    state.scheduledNotes.push(newNote)

    const secondsPerBeat = 60.0 / state.bpm / state.x
    state.nextNoteTime += secondsPerBeat

    state.noteToBeScheduled = (state.noteToBeScheduled + 1) % (state.x * state.y)
  }
}

// *********************************************************************************************************************
// Controls
// *********************************************************************************************************************
const isRunning = () => !!state.intervalID
const unlockAudio = () => {
  const buffer = state.audioContext.createBuffer(1, 1, 22050);
  const node = state.audioContext.createBufferSource();
  node.buffer = buffer;
  node.start(0);
}

const start = () => {
  if (!isRunning()) {
    if (!state.audioContext) {
      state.audioContext = new AudioContext()

      // TODO: do we need this?
      unlockAudio()
    }

    state.nextNoteTime = state.audioContext.currentTime + SCHEDULE_AHEAD_TIME
    state.noteToBeScheduled = 0
    state.scheduledNotes = []
    state.currentNote = 0


    state.intervalID = setInterval(() => {
      scheduleNotes()
    }, 100)
    window.requestAnimFrame(animateCells)
    renderPlayBtn()
  } else {
    clearInterval(state.intervalID)
    state.intervalID = undefined

    state.currentNote = undefined
    state.scheduledNotes = []

    highlightCell()
    renderPlayBtn()
  }
}

const renderTempo = () => {
  tempoLabelElm.textContent = `Tempo: ${state.bpm}`
}

const renderPlayBtn = () => {
  playBtn.innerHTML = isRunning() ? '<span class="play--stop">&#x25FC;</span>' : '<span class="play--play">&#x25B6;</span>'
}

// *********************************************************************************************************************
// Initialization
// *********************************************************************************************************************
const init = () => {
  incXBtn.addEventListener('click', () => {
    changeSignature('x', 1)();
    stop()
  })
  decXBtn.addEventListener('click', () => {
    changeSignature('x', -1)();
    stop()
  })
  incYBtn.addEventListener('click', () => {
    changeSignature('y', 1)();
    stop()
  })
  decYBtn.addEventListener('click', () => {
    changeSignature('y', -1)();
    stop()
  })
  playBtn.addEventListener('click', start)

  for (let i = 0; i < radioNoteElms.length; i++) {
    radioNoteElms[i].addEventListener('click', ev => {
      state.noteOption = NOTE_OPTIONS[i]
      renderGrid()
    })
  }

  tempoSliderElm.addEventListener('input', ev => {
    state.bpm = tempoSliderElm.value
    renderTempo()
  })

  renderLabel()
  renderGrid()
  renderTempo()
}
init()