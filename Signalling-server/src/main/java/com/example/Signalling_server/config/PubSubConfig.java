package com.example.Signalling_server.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

import java.net.InetAddress;

@Configuration
public class PubSubConfig {

    @Bean
    RedisMessageListenerContainer listenerContainer(
            RedisConnectionFactory factory,
            RedisSubscriber subscriber) throws Exception {

        RedisMessageListenerContainer container =
                new RedisMessageListenerContainer();

        container.setConnectionFactory(factory);

        String instanceId = InetAddress.getLocalHost().getHostName();

        container.addMessageListener(
                subscriber,
                new ChannelTopic("signal:" + instanceId)
        );

        return container;
    }
}