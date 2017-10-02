import React, { Component } from 'react';
import ReactCSSTransitionGroup from 'react-transition-group/CSSTransitionGroup';
import axios from 'axios';
import anime from 'animejs'

import wifi from './wifi.svg';
import shield from './shield.svg';
import aircon from './aircon.svg';
import './App.css';

const ISVG = require('react-inlinesvg');

/************Logo************/
class Logo extends Component {
  render() {
    return (
      <div className="logo">
        <ISVG src={aircon}></ISVG>
      </div>
    );
  }
}

/************Notify************/
class Notify extends Component {
  render() {
    return (
      <div className="notify">
        You are already connected to "{this.props.wifi_ssid}".
      </div>
    );
  }
}


/************Input************/
class InputField extends Component {
  constructor(props) {
    super(props);

    //bindings
    this.onClickListener = this.onClickListener.bind(this);
    this.onChangeListener = this.onChangeListener.bind(this);
    this.onFocusListener = this.onFocusListener.bind(this);
    
    //states
    this.state = {
      ssid: '',
      password: '',
      onClickListener: this.onClickListener,
      buttonLabel: 'Save Configuration',
      buttonClass: 'clickable'
    };

    this.ticker = null;
    this.counter = 0;
  }

  onClickListener(event){
    console.info(event);

    this.setState(
      { 
        buttonLabel: 'Saving...' ,
        onClickListener: null,
        buttonClass: 'loading'
      }
    )

    //Send WIFI configuration - 1st send config change
    axios.get(`http://www.reddit.com/r/japanlife.json`)
    .then(res => {
      const posts = res.data.data.children.map(obj => obj.data);
      console.log(posts);

      //2nd send Config save
      axios.get(`http://www.reddit.com/r/japanlife.json`)
      .then(res => {
        //Done here
      });

      //update
      this.setState({ 
        buttonLabel: 'Saved!', 
        buttonClass: 'done' 
      });

      //Set state to already connected
      setTimeout(() => {
        this.setState({ 
          buttonLabel: 'Rebooting Device.' 
        });

        this.ticker = setInterval(()=>{
          let label = "";
          if(this.counter < 5){
            label = this.state.buttonLabel + "."
          }else{
            label = "Waiting for Device."
            this.counter = 0;

            //Check for connection
            axios.get(`http://www.reddit.com/r/japanlife.jsonx`)
            .then(res => {
                //stop animation
                clearInterval(this.ticker);
                
                //refresh page
                window.location.reload();
            })
            .catch(err => {
              console.log("Not connected...wait...");
            });
          }

          this.setState({ 
            buttonLabel: label
          });

          this.counter++;
        }, 1000);
      },1000);

      //Set state to already connected
      setTimeout(() => {
        //clearInterval(this.ticker);

        //refresh page
        //window.location.reload();

      },10000);

    })
    .catch(err => {
      this.setState({ 
        buttonLabel: 'Error!!!', 
        buttonClass: 'error' 
      });

      return err; 
    });
  }

  onChangeListener(event){
    switch(event.target.id){
      case "ssid":{
        this.setState({ssid: event.target.value});
      }break;
      case "password":{
        this.setState({password: event.target.value});
      }break;
    }

    this.setState({value: event.target.value});
  }

  onFocusListener(event){
    event.target.select();
  }

  render() {
      return (
      <div className="inputField">
        <div>
          <div className='first'><img src={wifi} className="icon" alt="wifi ssid" /></div>
          <input type="text"  name="ssid" id="ssid" 
            value={this.state.ssid} 
            onChange={this.onChangeListener} 
            placeholder="Enter Network SSID"
            className='first'
            onFocus={this.onFocusListener}/>
        </div>
        <div>
          <div className='second'><img src={shield} className="icon" alt="wifi password" /></div>
          <input type="password" name="password" id="password" 
            value={this.state.password} 
            onChange={this.onChangeListener} 
            placeholder="Enter Wifi Password"
            className='second'
            onFocus={this.onFocusListener}/>
        </div>
        <input type="button" 
            className={this.state.buttonClass}
            value={this.state.buttonLabel} 
            onClick={this.state.onClickListener}/>
      </div>
    );
  }
}

/************APP************/
class App extends Component {
  constructor(props) {
    super(props);

    this.callback = this.callback.bind(this);

    //states
    this.state = {
      initializing: true,
      connected: false,

      ssid: 'janmir',
      ip:''
    };
  }

  componentDidMount() {
    var obj = { loading: 0 };
    
    var load_animation = anime({
      targets: obj,
      loading: 100,
      round: 1,
      easing: 'linear',
      duration: 2000,
      update: function() {
        var el = document.querySelector('#counter');
        el.innerHTML = obj.loading + "%";
      }
    });

    let timeOut = Math.floor(Math.random() * 500) + 10 ;
    setTimeout(() => {
      load_animation.pause();

      timeOut = Math.floor(Math.random() * 200) + 10 ;
      setTimeout(() => {
        load_animation.pause();
      }, timeOut);
  
    }, timeOut);

    axios.get(`http://www.reddit.com/r/japanlife.json`)
    .then(res => {
      load_animation.play();

      const posts = res.data.data.children.map(obj => obj.data);
      console.log(posts);

      //Set the state
      setTimeout(() => this.setState({ initializing: false }), 2500);
    })
    .catch(err => {
      return err; 
    });

    //add animation interval
    setInterval(() => {
      anime({
        targets: '.Artboard > path',
        strokeDashoffset: [anime.setDashoffset, 10],
        easing: 'easeInOutSine',
        duration: 800,
        delay: function(el, i) { return i * 100 },
        direction: 'alternate',
        loop: 4
      });
    }, 8000);
  }

  callback(json){
    this.setState(json);
  }

  render() {
    const { initializing } = this.state;
    
    if(initializing) {
      //Return initializing animation
      return (
        <div className="app center">
          <Logo/>
          <div id="counter"></div>
          <ReactCSSTransitionGroup 
            transitionName="anim" 
            transitionEnterTimeout={500} transitionAppearTimeout={500}  transitionLeaveTimeout={300} 
            transitionAppear={true} transitionEnter={true} transitionLeave={false} >
          </ReactCSSTransitionGroup>
        </div>
      );
    }else{
      const { connected } = this.state;

      //Check if already connected or not
      if(connected){
        console.log('CONNECTED!!');
        return (
          <div className="app center">
            <Logo/>
            <ReactCSSTransitionGroup 
              transitionName="anim" 
              transitionEnterTimeout={500} transitionAppearTimeout={500}  transitionLeaveTimeout={300} 
              transitionAppear={true} transitionEnter={true} transitionLeave={false} >
            <Notify 
                wifi_ssid={this.state.ssid}
                key='1'/>
            </ReactCSSTransitionGroup>
          </div>
        );
      }else{
        console.log('NOT CONNECTED!!');
        return (
          <div className="app center">
            <Logo/>
            <ReactCSSTransitionGroup 
              transitionName="anim" 
              transitionEnterTimeout={500} transitionAppearTimeout={500}  transitionLeaveTimeout={300} 
              transitionAppear={true} transitionEnter={true} transitionLeave={false} >
            <InputField
                key='0'
                callback={this.callback}/>
            </ReactCSSTransitionGroup>
          </div>
        );
      }
    }
  }
}

export default App;
