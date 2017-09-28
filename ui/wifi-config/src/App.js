import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

//Snippets
//<img src={logo} className="App-logo" alt="logo" />

/************Logo************/
class Logo extends Component {
  render() {
    return (
      <div className="logo">
        Logo Here
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

    //states
    this.state = {
      ssid: '',
      password: ''
    };
  }

  onClickListener(event){
    console.info(event);
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

  render() {
    return (
      <div className="inputField">
        <div>
          <div className='first'></div>
          <input type="text"  name="ssid" id="ssid" 
            value={this.state.ssid} 
            onChange={this.onChangeListener} 
            placeholder="Enter Network SSID"
            className='first'/>
        </div>
        <div>
          <div className='second'></div>
          <input type="password" name="password" id="password" 
            value={this.state.password} 
            onChange={this.onChangeListener} 
            placeholder="Enter Wifi Password"
            className='second'/>
        </div>
        <input type="button" value="Save" onClick={this.onClickListener}/>
      </div>
    );
  }
}

/************APP************/
class App extends Component {
  render() {
    return (
      <div className="app center">
        <Logo/>
        <InputField/>
      </div>
    );
  }
}

export default App;
