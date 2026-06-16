import streamlit as st
import os
import json
from dotenv import load_dotenv
import subprocess
import time

load_dotenv()

st.set_page_config(page_title="ENJAMBRE", page_icon="🐝", layout="wide")

st.title("🐝 ENJAMBRE")
st.markdown("**Dashboard Multi-Agente para Windows**")

# Sidebar
with st.sidebar:
    st.header("Proyecto")
    project = st.text_input("Nombre del proyecto", value="default")
    
    st.header("API Keys")
    grok_key = st.text_input("Grok API Key", value=os.getenv("GROK_API_KEY", ""), type="password")
    claude_key = st.text_input("Claude API Key", value=os.getenv("ANTHROPIC_API_KEY", ""), type="password")
    gemini_key = st.text_input("Gemini API Key", value=os.getenv("GEMINI_API_KEY", ""), type="password")
    
    if st.button("Validar Keys"):
        st.success("✅ Keys validadas (simulado)")

# Main area
col1, col2 = st.columns([3, 2])

with col1:
    st.subheader("Lanzar Enjambre")
    prompt = st.text_area("Ingresa tu prompt / tarea", height=150, placeholder="Crea una CLI de gestión de tareas en Python...")
    
    agents = st.multiselect("Agentes a usar", ["Grok", "Claude", "Codex", "Gemini"], default=["Grok", "Claude"])
    
    if st.button("🚀 Lanzar Enjambre", type="primary"):
        with st.spinner("Lanzando agentes..."):
            time.sleep(2)
            st.success("Enjambre lanzado! Revisa las ventanas o logs.")

with col2:
    st.subheader("Estado de Agentes")
    for agent in ["Grok", "Claude", "Codex", "Gemini"]:
        st.metric(label=agent, value="Activo", delta="Listo")

st.subheader("Logs en tiempo real")
log_placeholder = st.empty()

# Simple log simulation
for i in range(5):
    log_placeholder.text(f"[{time.strftime('%H:%M:%S')}] Agente trabajando...")
    time.sleep(0.5)

st.caption("ENJAMBRE v0.3 - GUI Edition")
